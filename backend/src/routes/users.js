const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/auth');

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

    res.json({
      status: 'success',
      data: { user }
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
          }
        },
        orderBy: {
          [orderBy]: order
        }
      }),
      prisma.user.count({ where })
    ]);

    // レスポンスデータの変換
    const transformedUsers = users.map(user => ({
      ...user,
      projects: user.projectMemberships.map(membership => ({
        ...membership.project,
        startDate: membership.startDate,
        endDate: membership.endDate
      }))
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
router.post('/', authenticate, authorize('ADMIN', 'COMPANY'), validateUserUpdate, async (req, res, next) => {
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

    const { email, password, firstName, lastName, role, companyId } = req.body;

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
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken);

    console.log('User created successfully:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company?.id
    });

    res.status(201).json({
      status: 'success',
      data: { user }
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
    const { projectId, managerId, role, position } = req.body;

    console.log('Updating user:', {
      userId,
      updateData: {
        projectId,
        managerId,
        role,
        position
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
        managedProjects: true,
        managedCompany: true
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
    if (projectId !== undefined) {
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

      if (projectId && !targetProject) {
        throw new AppError('Target project not found', 404);
      }

      if (projectId && targetProject.company.id !== userToUpdate.company?.id) {
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
    if (projectId !== undefined) {
      if (projectId) {
        // 既存のプロジェクトメンバーシップを削除
        await prisma.projectMembership.deleteMany({
          where: { userId }
        });
        // 新しいプロジェクトメンバーシップを作成
        updateData.projectMemberships = {
          create: {
            project: { connect: { id: projectId } },
            startDate: new Date(),
            endDate: null
          }
        };
      } else {
        // プロジェクトメンバーシップを削除
        updateData.projectMemberships = {
          deleteMany: {}
        };
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
    if (req.user.role === 'COMPANY' && userToDelete.company.id !== req.user.managedCompany.id) {
      throw new AppError('You can only delete users in your company', 403);
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 