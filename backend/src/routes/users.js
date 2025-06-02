const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/auth');
const { calculateTotalAllocation } = require('../utils/workload');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateUserUpdate = [
  body('firstName').optional().trim().notEmpty().withMessage('名前（名）は必須です'),
  body('lastName').optional().trim().notEmpty().withMessage('名前（姓）は必須です'),
  body('email').optional().isEmail().normalizeEmail().withMessage('有効なメールアドレスを入力してください'),
  body('role').optional().isIn(['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']).withMessage('無効なロールです'),
  body('isActive').optional().isBoolean().withMessage('isActiveは真偽値である必要があります'),
  body('position').optional().trim(),
  // companyIdのバリデーションを削除
];

// User creation validation (includes password requirement)
const validateUserCreate = [
  body('firstName').trim().notEmpty().withMessage('名前（名）は必須です'),
  body('lastName').trim().notEmpty().withMessage('名前（姓）は必須です'),
  body('email').isEmail().normalizeEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります'),
  body('role').isIn(['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']).withMessage('無効なロールです'),
  body('position').optional().trim(),
];

// Get current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        managedCompany: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // 会社管理者の場合、managedCompanyIdを確実に設定
    const userData = {
      ...user,
      managedCompanyId: user.managedCompany?.id || null,
      managedCompanyName: user.managedCompany?.name || null
    };

    console.log('User profile data:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      managedCompanyId: userData.managedCompanyId,
      managedCompanyName: userData.managedCompanyName
    });

    res.json({
      status: 'success',
      data: { user: userData }
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.patch('/me', authenticate, validateUserUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { firstName, lastName, email } = req.body;

    // Check if email is already taken
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('Email already taken', 400);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        email,
        isEmailVerified: email !== req.user.email ? false : undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true
      }
    });

    res.json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/me/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get all users (admin only) or company users (company manager)
router.get('/', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive, sort = 'createdAt:desc' } = req.query;
    const skip = (page - 1) * limit;

    // ソートパラメータの解析
    const [orderBy, order] = sort.split(':');
    const validOrderBy = ['createdAt', 'lastLoginAt', 'firstName', 'lastName', 'email'];
    const validOrder = ['asc', 'desc'];

    // ソートパラメータの検証
    if (!validOrderBy.includes(orderBy)) {
      throw new AppError('Invalid sort field', 400);
    }
    if (!validOrder.includes(order)) {
      throw new AppError('Invalid sort order', 400);
    }

    // 会社管理者の場合は、まず自分の会社情報を取得
    let managedCompanyId = null;
    if (req.user.role === 'COMPANY') {
      console.log('Company user fetching users:', {
        userId: req.user.id,
        managedCompanyId: req.user.managedCompanyId,
        managedCompany: req.user.managedCompany
      });

      if (!req.user.managedCompanyId) {
        throw new AppError('Company manager not associated with any company', 403);
      }

      managedCompanyId = req.user.managedCompanyId;
    }

    // クエリ条件の構築
    const where = {};
    
    // 会社管理者の場合は自分の会社のユーザーのみを取得
    if (req.user.role === 'COMPANY' && managedCompanyId) {
      where.companyId = managedCompanyId;
    }

    // ロールフィルターの処理
    if (role) {
      let roles;
      if (Array.isArray(role)) {
        roles = role;
      } else if (typeof role === 'string' && role.includes(',')) {
        roles = role.split(',');
      } else {
        roles = [role];
      }
      
      // ロールの大文字化と重複除去
      roles = [...new Set(roles.map(r => r.toUpperCase()))];
      
      // Prismaのクエリに合わせて条件を設定
      where.role = {
        in: roles
      };
    }

    // ステータスフィルターの処理
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      // デフォルトでは有効なユーザーのみ表示
      where.isActive = true;
    }

    // 検索条件の処理
    if (req.query.search) {
      where.OR = [
        { firstName: { contains: req.query.search, mode: 'insensitive' } },
        { lastName: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    console.log('Fetching users with conditions:', {
      where,
      skip,
      limit,
      userRole: req.user.role,
      managedCompanyId,
      roleFilter: role
    });

    // メンバー数を取得するためのクエリ
    const memberCounts = role === 'MANAGER' ? await prisma.user.groupBy({
      by: ['managerId'],
      where: {
        role: 'MEMBER',
        companyId: managedCompanyId || undefined
      },
      _count: {
        _all: true
      }
    }) : [];

    // メンバー数をマップに変換
    const memberCountMap = memberCounts.reduce((acc, curr) => {
      if (curr.managerId) {
        acc[curr.managerId] = curr._count._all;
      }
      return acc;
    }, {});

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          position: true,
          managerId: true,
          company: {
            select: {
              id: true,
              name: true
            }
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          projectMemberships: {
            select: {
              project: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              },
              startDate: true,
              endDate: true
            }
          },
          userSkills: {
            include: {
              skill: true
            }
          }
        },
        orderBy: {
          [orderBy]: order
        }
      }),
      prisma.user.count({ where })
    ]);

    // レスポンスデータの変換と総工数計算
    const transformedUsers = await Promise.all(users.map(async user => {
      try {
        const totalAllocation = await calculateTotalAllocation(user.id);
        return {
          ...user,
          skills: user.userSkills ? user.userSkills.map(userSkill => ({
            ...userSkill.skill,
            years: userSkill.years
          })) : [],
          projects: user.projectMemberships.map(membership => ({
            ...membership.project,
            startDate: membership.startDate,
            endDate: membership.endDate
          })),
          totalAllocation
        };
      } catch (error) {
        console.error(`Error calculating total allocation for user ${user.id}:`, error);
        return {
          ...user,
          skills: user.userSkills ? user.userSkills.map(userSkill => ({
            ...userSkill.skill,
            years: userSkill.years
          })) : [],
          projects: user.projectMemberships.map(membership => ({
            ...membership.project,
            startDate: membership.startDate,
            endDate: membership.endDate
          })),
          totalAllocation: 0
        };
      }
    }));

    // マネージャーの場合、所属メンバー数を追加
    const usersWithMemberCount = transformedUsers.map(user => ({
      ...user,
      managedMembers: user.role === 'MANAGER' ? (memberCountMap[user.id] || 0) : undefined
    }));

    console.log('Users fetched successfully:', {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      userCount: users.length
    });

    res.json({
      status: 'success',
      data: {
        users: usersWithMemberCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', {
      error: error.message,
      stack: error.stack,
      userRole: req.user.role,
      userId: req.user.id,
      userEmail: req.user.email,
      managedCompanyId: req.user.managedCompanyId,
      requestQuery: req.query
    });
    next(error);
  }
});

// Get company users (company manager only)
router.get('/company/:companyId', authenticate, authorize('COMPANY'), checkCompanyAccess, async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      companyId: companyId
    };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new user (admin or company manager)
router.post('/', authenticate, authorize('ADMIN', 'COMPANY'), validateUserCreate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));

      console.error('User creation validation errors:', {
        errors: validationErrors,
        body: req.body,
        user: {
          id: req.user.id,
          role: req.user.role,
          email: req.user.email,
          managedCompanyId: req.user.managedCompanyId
        }
      });

      throw new AppError('Validation failed', 400, validationErrors);
    }

    const { email, password, firstName, lastName, role, companyId, skills } = req.body;

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already taken', 400);
    }

    // Validate company access for company managers
    if (req.user.role === 'COMPANY' && companyId !== req.user.managedCompanyId) {
      throw new AppError('You can only create users for your own company', 403);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating new user:', {
      email,
      firstName,
      lastName,
      role,
      companyId: req.user.role === 'COMPANY' ? req.user.managedCompanyId : companyId,
      skills,
      createdBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        companyId: req.user.role === 'COMPANY' ? req.user.managedCompanyId : companyId,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Process skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      const userSkillsData = skills
        .filter(skill => skill.skillId) // skillIdが存在するもののみ
        .map(skill => ({
          userId: user.id,
          skillId: skill.skillId,
          years: skill.years ? parseInt(skill.years, 10) : null
        }));
      
      if (userSkillsData.length > 0) {
        await prisma.userSkill.createMany({
          data: userSkillsData
        });
      }
    }

    // Get complete user data with skills
    const completeUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        userSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    // Transform the response data
    const transformedUser = {
      ...completeUser,
      skills: completeUser.userSkills ? completeUser.userSkills.map(userSkill => ({
        ...userSkill.skill,
        years: userSkill.years
      })) : []
    };

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken);

    console.log('User created successfully:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: completeUser.company?.id,
      skillCount: transformedUser.skills.length
    });

    res.status(201).json({
      status: 'success',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('Error creating user:', {
      error: error.message,
      stack: error.stack,
      validationErrors: error.errors,
      requestBody: req.body,
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
        managedCompanyId: req.user.managedCompanyId
      }
    });
    next(error);
  }
});

// Update user (admin or company manager)
router.patch('/:userId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateUserUpdate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { projectId, managerId, role, position, firstName, lastName, email, isActive, skills } = req.body;

    console.log('Updating user:', {
      userId,
      updateData: {
        projectId,
        managerId,
        role,
        position,
        firstName,
        lastName,
        email,
        isActive,
        skills
      },
      updatedBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });

    // 更新対象のユーザーを取得
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        manager: true,
        projectMemberships: {
          include: {
            project: true
          }
        },
        managedMembers: true,
        managedCompany: true,
        userSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!userToUpdate) {
      throw new AppError('User not found', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY') {
      if (userToUpdate.company?.id !== req.user.managedCompanyId) {
        throw new AppError('You can only update users in your company', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (userToUpdate.company?.id !== req.user.companyId) {
        throw new AppError('You can only update users in your company', 403);
      }
      if (userToUpdate.manager?.id !== req.user.id) {
        throw new AppError('You can only update users you manage', 403);
      }
    }

    // プロジェクト割り当ての場合は、割り当て先のプロジェクトが同じ会社に所属しているか確認
    if (projectId !== undefined && projectId !== null) {
      const targetProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: { company: true }
      });

      console.log('Target project check:', {
        projectId,
        projectName: targetProject?.name,
        projectCompanyId: targetProject?.company?.id,
        userCompanyId: userToUpdate.company?.id
      });

      if (!targetProject) {
        throw new AppError('Target project not found', 404);
      }

      if (targetProject.company.id !== userToUpdate.company?.id) {
        throw new AppError('Target project is not in the same company', 403);
      }
    }

    // マネージャー割り当ての場合は、割り当て先のマネージャーが同じ会社に所属しているか確認
    if (managerId) {
      const targetManager = await prisma.user.findUnique({
        where: { id: managerId },
        include: { company: true }
      });

      console.log('Target manager check:', {
        managerId,
        managerName: targetManager ? `${targetManager.firstName} ${targetManager.lastName}` : null,
        managerRole: targetManager?.role,
        managerCompanyId: targetManager?.company?.id,
        userCompanyId: userToUpdate.company?.id
      });

      if (!targetManager) {
        throw new AppError('Target manager not found', 404);
      }

      if (targetManager.role !== 'MANAGER') {
        throw new AppError('Target user is not a manager', 403);
      }

      if (targetManager.company?.id !== userToUpdate.company?.id) {
        throw new AppError('Target manager is not in the same company', 403);
      }
    }

    // 会社管理者はロールをMANAGERとMEMBERの間でのみ変更可能
    if (role && !['MANAGER', 'MEMBER'].includes(role)) {
      console.error('Invalid role change attempt:', {
        currentRole: userToUpdate.role,
        requestedRole: role,
        allowedRoles: ['MANAGER', 'MEMBER']
      });
      throw new AppError('You can only set roles to MANAGER or MEMBER', 403);
    }

    // 更新データの準備
    const updateData = {};
    
    // 基本情報の更新
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (projectId !== undefined) {
      // 既存のプロジェクトメンバーシップを削除
      await prisma.projectMembership.deleteMany({
        where: { userId }
      });
      
      if (projectId) {
        // 新しいプロジェクトメンバーシップを作成
        updateData.projectMemberships = {
          create: {
            project: { connect: { id: projectId } },
            startDate: new Date(),
            endDate: null
          }
        };
      }
      // projectId が null の場合は、メンバーシップを削除するだけで良い（上記の deleteMany で処理済み）
    }
    
    // スキルの更新処理
    if (skills && Array.isArray(skills)) {
      // 現在のユーザースキルを削除
      await prisma.userSkill.deleteMany({
        where: { userId }
      });
      
      // 新しいスキルを追加
      if (skills.length > 0) {
        const userSkillsData = skills
          .filter(skill => skill.skillId) // skillIdが存在するもののみ
          .map(skill => ({
            userId,
            skillId: skill.skillId,
            years: skill.years ? parseInt(skill.years, 10) : null
          }));
        
        if (userSkillsData.length > 0) {
          await prisma.userSkill.createMany({
            data: userSkillsData
          });
        }
      }
    }
    
    if (managerId) updateData.managerId = managerId;
    if (role) updateData.role = role;
    if (position) updateData.position = position;

    // ユーザー情報の更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        userSkills: {
          include: {
            skill: true
          }
        },
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    // レスポンスデータの変換
    const transformedUser = {
      ...updatedUser,
      skills: updatedUser.userSkills ? updatedUser.userSkills.map(userSkill => ({
        ...userSkill.skill,
        years: userSkill.years
      })) : [],
      projects: updatedUser.projectMemberships.map(membership => ({
        ...membership.project,
        startDate: membership.startDate,
        endDate: membership.endDate
      }))
    };

    console.log('User updated successfully:', {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      projectId: transformedUser.projects[0]?.id,
      managerId: updatedUser.managerId,
      updatedBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });

    res.json({
      status: 'success',
      data: { user: transformedUser }
    });
  } catch (error) {
    console.error('User update error:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      requestBody: req.body,
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });
    next(error);
  }
});

// Toggle user status (activate/deactivate)
router.patch('/:userId/status', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive must be a boolean value', 400);
    }

    // Get user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!userToUpdate) {
      throw new AppError('User not found', 404);
    }

    // Check company access for company managers
    if (req.user.role === 'COMPANY' && userToUpdate.company?.id !== req.user.managedCompanyId) {
      throw new AppError('You can only update users in your company', 403);
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });

    res.json({
      status: 'success',
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin or company manager)
router.delete('/:userId', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Get user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!userToDelete) {
      throw new AppError('User not found', 404);
    }

    // Check company access for company managers
    if (req.user.role === 'COMPANY' && userToDelete.company?.id !== req.user.managedCompanyId) {
      throw new AppError('You can only delete users in your company', 403);
    }

    // 完全削除のみ（isActive: false等の論理削除は一切しない）
    await prisma.$transaction(async (tx) => {
      // Delete project memberships
      await tx.projectMembership.deleteMany({
        where: { userId }
      });
      // Delete user-skill relations (多対多リレーション解除)
      await tx.userSkill.deleteMany({
        where: { userId: userId }
      });
      // Update any users who have this user as manager
      await tx.user.updateMany({
        where: { managerId: userId },
        data: { managerId: null }
      });
      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('User delete error:', error, error?.meta);
    next(error);
  }
});

// スキル一覧取得API
router.get('/skills', authenticate, async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      select: { 
        id: true, 
        name: true,
        _count: {
          select: { userSkills: true }
        }
      }
    });
    res.json({
      status: 'success',
      data: { skills }
    });
  } catch (error) {
    next(error);
  }
});

// スキル新規追加API
router.post('/skills', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'スキル名は必須です' });
    }
    // 既存チェック
    let skill = await prisma.skill.findUnique({ where: { name: name.trim() } });
    if (!skill) {
      skill = await prisma.skill.create({ 
        data: { name: name.trim() },
        select: { 
          id: true, 
          name: true,
          _count: {
            select: { userSkills: true }
          }
        }
      });
    }
    res.json({ status: 'success', data: { skill } });
  } catch (error) {
    next(error);
  }
});

// スキル更新API
router.patch('/skills/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'スキル名は必須です' });
    }

    // 既存のスキル名チェック（自分以外）
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: name.trim(),
        NOT: { id }
      }
    });

    if (existingSkill) {
      return res.status(400).json({ status: 'error', message: 'そのスキル名は既に存在します' });
    }

    const skill = await prisma.skill.update({
      where: { id },
      data: { name: name.trim() },
      select: { 
        id: true, 
        name: true,
        _count: {
          select: { userSkills: true }
        }
      }
    });

    res.json({ status: 'success', data: { skill } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'スキルが見つかりません' });
    }
    next(error);
  }
});

// スキル削除API
router.delete('/skills/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 使用されているスキルかチェック
    const skillWithUsers = await prisma.skill.findUnique({
      where: { id },
      select: {
        name: true,
        _count: {
          select: { userSkills: true }
        }
      }
    });

    if (!skillWithUsers) {
      return res.status(404).json({ status: 'error', message: 'スキルが見つかりません' });
    }

    if (skillWithUsers._count.userSkills > 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: `このスキルは${skillWithUsers._count.userSkills}人のユーザーに使用されているため削除できません` 
      });
    }

    await prisma.skill.delete({
      where: { id }
    });

    res.json({ status: 'success', message: 'スキルを削除しました' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'スキルが見つかりません' });
    }
    next(error);
  }
});

module.exports = router;