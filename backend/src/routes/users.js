const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/auth');
const { calculateTotalAllocation } = require('../utils/workload');
const { sendVerificationEmail, sendCredentialsWelcomeEmail } = require('../utils/email');

const router = express.Router();
const prisma = new PrismaClient();

// Generate secure random password
const generateSecurePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Validation middleware
const validateUserUpdate = [
  body('firstName').optional().trim().notEmpty().withMessage('名前（名）は必須です'),
  body('lastName').optional().trim().notEmpty().withMessage('名前（姓）は必須です'),
  body('email').optional().isEmail().normalizeEmail().withMessage('有効なメールアドレスを入力してください'),
  body('role').optional().isIn(['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']).withMessage('無効なロールです'),
  body('isActive').optional().isBoolean().withMessage('isActiveは真偽値である必要があります'),
  body('position').optional().trim(),
  body('phone').optional().trim(),
  body('prefecture').optional().trim(),
  body('city').optional().trim(),
  body('streetAddress').optional().trim(),
];

// User creation validation (password is optional - will be auto-generated if not provided)
const validateUserCreate = [
  body('firstName').trim().notEmpty().withMessage('名前（名）は必須です'),
  body('lastName').trim().notEmpty().withMessage('名前（姓）は必須です'),
  body('email').isEmail().normalizeEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').optional().isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります'),
  body('role').isIn(['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']).withMessage('無効なロールです'),
  body('position').optional().trim(),
  body('phone').optional().trim(),
  body('prefecture').optional().trim(),
  body('city').optional().trim(),
  body('streetAddress').optional().trim(),
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
        phone: true,
        prefecture: true,
        city: true,
        streetAddress: true,
        position: true,
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

    const { firstName, lastName, email, phone, prefecture, city, streetAddress, position } = req.body;

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
        phone,
        prefecture,
        city,
        streetAddress,
        position,
        isEmailVerified: email !== req.user.email ? false : undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        phone: true,
        prefecture: true,
        city: true,
        streetAddress: true,
        position: true
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

// Get all users (admin only) or company users (管理者用)
router.get('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive, sort = 'createdAt:desc', companyId } = req.query;
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

    // 管理者の場合は、まず自分の会社情報を取得
    let managedCompanyId = null;
    if (req.user.role === 'COMPANY') {
      console.log('管理者がユーザーを取得中:', {
        userId: req.user.id,
        managedCompanyId: req.user.managedCompanyId,
        managedCompany: req.user.managedCompany
      });

      if (!req.user.managedCompanyId) {
        throw new AppError('管理者が会社に関連付けられていません', 403);
      }

      managedCompanyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      console.log('マネージャーがユーザーを取得中:', {
        userId: req.user.id,
        companyId: req.user.companyId
      });

      if (!req.user.companyId) {
        throw new AppError('マネージャーが会社に関連付けられていません', 403);
      }

      managedCompanyId = req.user.companyId;
    }

    // クエリ条件の構築
    const where = {};
    
    // 管理者またはマネージャーの場合は自分の会社のユーザーのみを取得
    if ((req.user.role === 'COMPANY' || req.user.role === 'MANAGER') && managedCompanyId) {
      where.companyId = managedCompanyId;
    }
    
    // ADMINが特定の会社を指定した場合
    if (req.user.role === 'ADMIN' && companyId) {
      where.companyId = companyId;
    }
    
    // COMPANY/MANAGERが自分以外の会社を指定しようとした場合はエラー
    if ((req.user.role === 'COMPANY' || req.user.role === 'MANAGER') && companyId && companyId !== managedCompanyId) {
      throw new AppError('他の会社のユーザーにはアクセスできません', 403);
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
          phone: true,
          prefecture: true,
          city: true,
          streetAddress: true,
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
              companySelectedSkill: {
                include: {
                  globalSkill: true
                }
              }
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
            id: userSkill.companySelectedSkill?.id,  // CompanySelectedSkill.idを使用
            name: userSkill.companySelectedSkill?.globalSkill?.name,
            category: userSkill.companySelectedSkill?.globalSkill?.category,
            years: userSkill.years
          })).filter(skill => skill.name) : [],
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
            id: userSkill.companySelectedSkill?.globalSkill?.id,
            name: userSkill.companySelectedSkill?.globalSkill?.name,
            category: userSkill.companySelectedSkill?.globalSkill?.category,
            years: userSkill.years
          })).filter(skill => skill.name) : [],
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

// Get company users (管理者のみ)
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

// Create new user (admin or 管理者)
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

    const { email, password, firstName, lastName, role, skills, position, phone, prefecture, city, streetAddress } = req.body;

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already taken', 400);
    }

    // Generate password if not provided, or use provided password
    const finalPassword = password || generateSecurePassword();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

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
        position: position || null,
        phone: phone || null,
        prefecture: prefecture || null,
        city: city || null,
        streetAddress: streetAddress || null,
        companyId: req.user.role === 'COMPANY' ? req.user.managedCompanyId : null,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Process skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      const targetCompanyId = req.user.role === 'COMPANY' ? req.user.managedCompanyId : user.companyId;
      
      // スキルが同じ会社に属しているかチェック
      const skillIds = skills
        .filter(skill => skill.skillId)
        .map(skill => skill.skillId);
      
      if (skillIds.length > 0 && targetCompanyId) {
        console.log('🔍 ユーザー作成時のスキル検証:');
        console.log('  - skillIds:', skillIds);
        console.log('  - targetCompanyId:', targetCompanyId);
        
        // 新しいスキル管理システムに対応: CompanySelectedSkillで検証
        const validCompanySkills = await prisma.companySelectedSkill.findMany({
          where: {
            id: { in: skillIds },
            companyId: targetCompanyId
          }
        });

        console.log('  - validCompanySkills found by ID:', validCompanySkills.length);

        // CompanySelectedSkill.idで検証が失敗した場合、代替検証を実行
        if (validCompanySkills.length !== skillIds.length) {
          console.log('🔄 CompanySelectedSkill.idで検証失敗、代替検証を実行中...');
          
          // 代替案1: 古いSkillテーブルで検証
          const legacySkills = await prisma.skill.findMany({
            where: {
              id: { in: skillIds },
              companyId: targetCompanyId
            }
          });
          
          if (legacySkills.length === skillIds.length) {
            console.log('✅ 古いSkillテーブルで検証成功');
            // 古いスキルシステムを使用
            const userSkillsData = skills
              .filter(skill => skill.skillId && skillIds.includes(skill.skillId))
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
          } else {
            // 代替案2: GlobalSkillのIDからCompanySelectedSkillを検索
            const companySkillsByGlobalId = await prisma.companySelectedSkill.findMany({
              where: {
                globalSkillId: { in: skillIds },
                companyId: targetCompanyId
              }
            });
            
            if (companySkillsByGlobalId.length === skillIds.length) {
              console.log('✅ GlobalSkill IDによる検証成功');
              // skillIdsをCompanySelectedSkill.idに変換して新しいシステムを使用
              const userSkillsData = skills
                .filter(skill => skill.skillId)
                .map(skill => {
                  const companySkill = companySkillsByGlobalId.find(cs => cs.globalSkillId === skill.skillId);
                  return {
                    userId: user.id,
                    companySelectedSkillId: companySkill ? companySkill.id : null,
                    years: skill.years ? parseInt(skill.years, 10) : null
                  };
                })
                .filter(skill => skill.companySelectedSkillId);
              
              if (userSkillsData.length > 0) {
                await prisma.userSkill.createMany({
                  data: userSkillsData
                });
              }
            } else {
              console.log('❌ 全ての検証方法で失敗');
              throw new AppError('指定されたスキルの中に、この会社に属さないものが含まれています', 400);
            }
          }
        } else {
          console.log('✅ CompanySelectedSkill.idで検証成功');
          // 新しいスキルシステムを使用
          const userSkillsData = skills
            .filter(skill => skill.skillId && skillIds.includes(skill.skillId))
            .map(skill => ({
              userId: user.id,
              companySelectedSkillId: skill.skillId,
              years: skill.years ? parseInt(skill.years, 10) : null
            }));
          
          if (userSkillsData.length > 0) {
            await prisma.userSkill.createMany({
              data: userSkillsData
            });
          }
        }
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
            companySelectedSkill: {
              include: {
                globalSkill: true
              }
            }
          }
        }
      }
    });

    // Transform the response data
    const transformedUser = {
      ...completeUser,
      skills: completeUser.userSkills ? completeUser.userSkills.map(userSkill => ({
        id: userSkill.companySelectedSkill?.id,  // CompanySelectedSkill.idを使用
        name: userSkill.companySelectedSkill?.globalSkill?.name,
        category: userSkill.companySelectedSkill?.globalSkill?.category,
        years: userSkill.years
      })).filter(skill => skill.name) : []
    };

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken);

    // Send credentials welcome email with login information
    try {
      await sendCredentialsWelcomeEmail(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: finalPassword, // Send the original password before hashing
        companyName: completeUser.company?.name || '未設定'
      });
      console.log('Credentials welcome email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Failed to send credentials welcome email:', emailError);
      // Continue execution even if email fails
    }

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

// Update user (admin or 管理者)
router.patch('/:userId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateUserUpdate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { projectId, managerId, role, position, firstName, lastName, email, isActive, skills, phone, prefecture, city, streetAddress } = req.body;

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
        throw new AppError('自分の会社のユーザーのみ更新できます', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (userToUpdate.company?.id !== req.user.companyId) {
        throw new AppError('自分の会社のユーザーのみ更新できます', 403);
      }
      if (userToUpdate.manager?.id !== req.user.id) {
        throw new AppError('管理しているユーザーのみ更新できます', 403);
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
        throw new AppError('同じ会社のプロジェクトのみ割り当てできます', 403);
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
        throw new AppError('対象のマネージャーが見つかりません', 404);
      }

      if (targetManager.role !== 'MANAGER') {
        throw new AppError('対象のユーザーはマネージャーではありません', 403);
      }

      if (targetManager.company?.id !== userToUpdate.company?.id) {
        throw new AppError('同じ会社のマネージャーのみ割り当てできます', 403);
      }
    }

    // 管理者はロールをMANAGERとMEMBERの間でのみ変更可能
    if (role && !['MANAGER', 'MEMBER'].includes(role)) {
      console.error('Invalid role change attempt:', {
        currentRole: userToUpdate.role,
        requestedRole: role,
        allowedRoles: ['MANAGER', 'MEMBER']
      });
      throw new AppError('ロールはマネージャーまたはメンバーのみ設定できます', 403);
    }

    // 更新データの準備
    const updateData = {};
    
    // 基本情報の更新
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (position !== undefined) updateData.position = position;
    if (phone !== undefined) updateData.phone = phone;
    if (prefecture !== undefined) updateData.prefecture = prefecture;
    if (city !== undefined) updateData.city = city;
    if (streetAddress !== undefined) updateData.streetAddress = streetAddress;
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
      // ユーザーの会社IDを取得
      const targetCompanyId = userToUpdate.companyId;
      
      if (!targetCompanyId) {
        throw new AppError('ユーザーの会社情報が見つかりません', 400);
      }

      // 現在のユーザースキルを削除
      await prisma.userSkill.deleteMany({
        where: { userId }
      });
      
      // 新しいスキルを追加
      if (skills.length > 0) {
        console.log('📊 受信したスキルデータ:');
        console.log('  - skills:', JSON.stringify(skills, null, 2));
        
        // スキルが同じ会社に属しているかチェック
        const skillIds = skills
          .filter(skill => skill.skillId)
          .map(skill => skill.skillId);
        
        console.log('  - フィルター後のskillIds:', skillIds);
        
        if (skillIds.length > 0) {
          console.log('🔍 スキル検証開始:');
          console.log('  - skillIds:', skillIds);
          console.log('  - targetCompanyId:', targetCompanyId);
          
          // 新しいスキル管理システムに対応: フロントエンドからのIDがCompanySelectedSkill.idかどうかを確認
          const validCompanySkills = await prisma.companySelectedSkill.findMany({
            where: {
              id: { in: skillIds },
              companyId: targetCompanyId
            }
          });

          console.log('  - validCompanySkills found by ID:', validCompanySkills.length);
          console.log('  - validCompanySkills by ID:', validCompanySkills.map(s => s.id));

          // CompanySelectedSkill.idで検証が失敗した場合、古いSkill.idまたはGlobalSkill.idかもしれない
          if (validCompanySkills.length !== skillIds.length) {
            console.log('🔄 CompanySelectedSkill.idで検証失敗、代替検証を実行中...');
            
            // 代替案1: 古いSkillテーブルで検証
            const legacySkills = await prisma.skill.findMany({
              where: {
                id: { in: skillIds },
                companyId: targetCompanyId
              }
            });
            
            console.log('  - Legacy skills found:', legacySkills.length);
            
            if (legacySkills.length === skillIds.length) {
              console.log('✅ 古いSkillテーブルで検証成功');
              // 古いスキルシステムを使用
            } else {
              // 代替案2: GlobalSkillのIDからCompanySelectedSkillを検索
              const companySkillsByGlobalId = await prisma.companySelectedSkill.findMany({
                where: {
                  globalSkillId: { in: skillIds },
                  companyId: targetCompanyId
                }
              });
              
              console.log('  - CompanySelectedSkills by GlobalSkill ID:', companySkillsByGlobalId.length);
              
              if (companySkillsByGlobalId.length === skillIds.length) {
                console.log('✅ GlobalSkill IDによる検証成功');
                // skillIdsをCompanySelectedSkill.idに変換
                const updatedSkills = skills.map(skill => {
                  const companySkill = companySkillsByGlobalId.find(cs => cs.globalSkillId === skill.skillId);
                  return {
                    ...skill,
                    skillId: companySkill ? companySkill.id : skill.skillId
                  };
                });
                skills = updatedSkills;
              } else {
                console.log('❌ 全ての検証方法で失敗:');
                console.log('  - CompanySelectedSkill.id検証:', validCompanySkills.length, '/', skillIds.length);
                console.log('  - Legacy Skill検証:', legacySkills.length, '/', skillIds.length);
                console.log('  - GlobalSkill ID検証:', companySkillsByGlobalId.length, '/', skillIds.length);
                console.log('  - 無効なスキルID:', skillIds);
                throw new AppError('指定されたスキルの中に、この会社に属さないものが含まれています', 400);
              }
            }
          } else {
            console.log('✅ CompanySelectedSkill.idで検証成功');
          }

          // スキルIDを再取得（変換後の値を使用）
          const finalSkillIds = skills
            .filter(skill => skill.skillId)
            .map(skill => skill.skillId);

          const userSkillsData = skills
            .filter(skill => skill.skillId && finalSkillIds.includes(skill.skillId))
            .map(skill => ({
              userId,
              companySelectedSkillId: skill.skillId, // 新しいフィールドを使用
              years: skill.years ? parseInt(skill.years, 10) : null
            }));
          
          if (userSkillsData.length > 0) {
            await prisma.userSkill.createMany({
              data: userSkillsData
            });
          }
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
        id: userSkill.companySelectedSkill?.id,  // CompanySelectedSkill.idを使用
        name: userSkill.companySelectedSkill?.globalSkill?.name,
        category: userSkill.companySelectedSkill?.globalSkill?.category,
        years: userSkill.years
      })).filter(skill => skill.name) : [],
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

    // Check company access for managers
    if (req.user.role === 'COMPANY' && userToUpdate.company?.id !== req.user.managedCompanyId) {
      throw new AppError('自分の会社のユーザーのみ更新できます', 403);
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

// Delete user (admin or 管理者)
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

    // Check company access for managers
    if (req.user.role === 'COMPANY' && userToDelete.company?.id !== req.user.managedCompanyId) {
      throw new AppError('自分の会社のユーザーのみ削除できます', 403);
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

// Get all skills (Updated for new skill system)
router.get('/skills', authenticate, async (req, res, next) => {
  try {
    let companyId;
    
    if (req.user.role === 'ADMIN') {
      // Admin can see all company skills grouped by company
      const companySkills = await prisma.companySelectedSkill.findMany({
        include: {
          globalSkill: true,
          company: { select: { name: true } },
          _count: {
            select: { userSkills: true }
          }
        },
        orderBy: [
          { company: { name: 'asc' } },
          { globalSkill: { category: 'asc' } },
          { globalSkill: { name: 'asc' } }
        ]
      });

      // Transform to legacy format for compatibility
      const skills = companySkills.map(cs => ({
        id: cs.id,
        name: cs.globalSkill.name,
        category: cs.globalSkill.category,
        companyId: cs.companyId,
        company: cs.company,
        _count: {
          userSkills: cs._count.userSkills
        }
      }));

      return res.json({
        status: 'success',
        data: { skills }
      });
    } else if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else {
      companyId = req.user.companyId;
    }

    if (!companyId) {
      return res.status(400).json({ 
        status: 'error', 
        message: '会社情報が見つかりません' 
      });
    }

    const companySkills = await prisma.companySelectedSkill.findMany({
      where: { companyId },
      include: {
        globalSkill: true,
        _count: {
          select: { userSkills: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { globalSkill: { category: 'asc' } },
        { globalSkill: { name: 'asc' } }
      ]
    });

    // Transform to legacy format for compatibility
    const skills = companySkills.map(cs => ({
      id: cs.id,
      name: cs.globalSkill.name,
      category: cs.globalSkill.category,
      companyId: cs.companyId,
      _count: {
        userSkills: cs._count.userSkills
      }
    }));

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

    // ユーザーの会社IDを取得
    let companyId;
    if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'ADMIN') {
      // 管理者は指定された会社ID、または最初の会社
      companyId = req.body.companyId;
      if (!companyId) {
        const firstCompany = await prisma.company.findFirst();
        companyId = firstCompany?.id;
      }
    } else {
      companyId = req.user.companyId;
    }

    if (!companyId) {
      return res.status(400).json({ 
        status: 'error', 
        message: '会社情報が見つかりません' 
      });
    }

    // 同じ会社内での既存チェック
    const existingSkill = await prisma.skill.findFirst({ 
      where: { 
        name: name.trim(),
        companyId: companyId
      }
    });

    if (existingSkill) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'この会社にはすでに同じ名前のスキルが存在します' 
      });
    }

    const skill = await prisma.skill.create({ 
      data: { 
        name: name.trim(),
        companyId: companyId
      },
      select: { 
        id: true, 
        name: true,
        companyId: true,
        _count: {
          select: { userSkills: true }
        }
      }
    });

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

    // スキルの存在確認と会社アクセス権限チェック
    const currentSkill = await prisma.skill.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!currentSkill) {
      return res.status(404).json({ status: 'error', message: 'スキルが見つかりません' });
    }

    // 権限チェック
    let hasAccess = false;
    if (req.user.role === 'ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'COMPANY' && req.user.managedCompanyId === currentSkill.companyId) {
      hasAccess = true;
    } else if (req.user.companyId === currentSkill.companyId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        status: 'error', 
        message: '自分の会社のスキルのみ編集できます' 
      });
    }

    // 同じ会社内での既存のスキル名チェック（自分以外）
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: name.trim(),
        companyId: currentSkill.companyId,
        NOT: { id }
      }
    });

    if (existingSkill) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'この会社にはすでに同じ名前のスキルが存在します' 
      });
    }

    const skill = await prisma.skill.update({
      where: { id },
      data: { name: name.trim() },
      select: { 
        id: true, 
        name: true,
        companyId: true,
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

    // スキルの存在確認と会社アクセス権限チェック
    const skillWithUsers = await prisma.skill.findUnique({
      where: { id },
      select: {
        name: true,
        companyId: true,
        company: { select: { name: true } },
        _count: {
          select: { userSkills: true }
        }
      }
    });

    if (!skillWithUsers) {
      return res.status(404).json({ status: 'error', message: 'スキルが見つかりません' });
    }

    // 権限チェック
    let hasAccess = false;
    if (req.user.role === 'ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'COMPANY' && req.user.managedCompanyId === skillWithUsers.companyId) {
      hasAccess = true;
    } else if (req.user.companyId === skillWithUsers.companyId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        status: 'error', 
        message: '自分の会社のスキルのみ削除できます' 
      });
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

// Get all skills
router.get('/skills', authenticate, async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      status: 'success',
      data: skills
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;