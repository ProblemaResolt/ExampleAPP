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
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (page - 1) * limit;

    // 会社管理者の場合は、まず自分の会社情報を取得
    let managedCompanyId = null;
    if (req.user.role === 'COMPANY') {
      const companyManager = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          managedCompany: true
        }
      });

      if (!companyManager?.managedCompany) {
        throw new AppError('Company manager not associated with any company', 403);
      }

      managedCompanyId = companyManager.managedCompany.id;
    }

    // クエリ条件の構築
    const where = {};
    
    // 会社管理者の場合は自分の会社のユーザーのみを取得
    if (req.user.role === 'COMPANY' && managedCompanyId) {
      where.companyId = managedCompanyId;
      
      // 会社管理者はマネージャーとメンバーのみを表示
      where.role = {
        in: ['MANAGER', 'MEMBER']
      };
    }

    // 追加のフィルター条件
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

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
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // マネージャーの場合、所属メンバー数を追加
    const usersWithMemberCount = users.map(user => ({
      ...user,
      managedMembers: user.role === 'MANAGER' ? (memberCountMap[user.id] || 0) : undefined
    }));

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
      userEmail: req.user.email
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
      throw new AppError('Validation failed', 400, errors.array());
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
    if (req.user.role === 'COMPANY' && companyId !== req.user.managedCompany.id) {
      throw new AppError('You can only create users for your own company', 403);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        companyId: req.user.role === 'COMPANY' ? req.user.managedCompany.id : companyId,
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

    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// Update user (admin or company manager)
router.patch('/:userId', authenticate, authorize('ADMIN', 'COMPANY'), validateUserUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', JSON.stringify(errors.array(), null, 2));
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      throw new AppError('Validation failed', 400, {
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        })),
        requestBody: req.body
      });
    }

    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive, companyId, position, managerId } = req.body;

    // リクエストデータのログ出力
    console.log('=== User Update Request ===');
    console.log('Request details:', {
      userId,
      updateData: { firstName, lastName, email, role, isActive, companyId, position, managerId },
      currentUser: {
        id: req.user.id,
        role: req.user.role,
        managedCompanyId: req.user.managedCompany?.id,
        email: req.user.email
      }
    });

    // Get user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        company: true,
        managedCompany: true,
        manager: true
      }
    });

    console.log('User to update:', {
      id: userToUpdate?.id,
      name: userToUpdate ? `${userToUpdate.firstName} ${userToUpdate.lastName}` : null,
      role: userToUpdate?.role,
      companyId: userToUpdate?.company?.id,
      companyName: userToUpdate?.company?.name,
      managerId: userToUpdate?.managerId,
      managerName: userToUpdate?.manager ? `${userToUpdate.manager.firstName} ${userToUpdate.manager.lastName}` : null
    });

    if (!userToUpdate) {
      throw new AppError('User not found', 404);
    }

    // Check company access for company managers
    if (req.user.role === 'COMPANY') {
      console.log('Company access check:', {
        userCompanyId: userToUpdate.company?.id,
        managerCompanyId: req.user.managedCompany?.id,
        userRole: req.user.role,
        targetUserRole: userToUpdate.role,
        requestedRole: role,
        requestedManagerId: managerId
      });

      // 会社管理者は自分の会社のマネージャーとメンバーのみ更新可能
      if (userToUpdate.company?.id !== req.user.managedCompany?.id) {
        console.error('Company access denied:', {
          userCompanyId: userToUpdate.company?.id,
          managerCompanyId: req.user.managedCompany?.id,
          userRole: req.user.role
        });
        throw new AppError('You can only update users in your company', 403);
      }

      // 会社管理者はマネージャーとメンバーのみ更新可能
      if (!['MANAGER', 'MEMBER'].includes(userToUpdate.role)) {
        console.error('Invalid user role for company manager:', {
          userRole: userToUpdate.role,
          allowedRoles: ['MANAGER', 'MEMBER']
        });
        throw new AppError('You can only update managers and members', 403);
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

      // 会社管理者は会社IDを変更できない
      if (companyId && companyId !== userToUpdate.company?.id) {
        console.error('Company ID change attempt:', {
          currentCompanyId: userToUpdate.company?.id,
          requestedCompanyId: companyId
        });
        throw new AppError('Company managers cannot change user company', 403);
      }

      // 会社管理者は会社IDを変更できないため、リクエストから削除
      delete req.body.companyId;
    }

    // Check if email is already taken
    if (email && email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('Email already taken', 400);
      }
    }

    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      email,
      role,
      isActive,
      position,
      isEmailVerified: email !== userToUpdate.email ? false : undefined
    };

    // 会社IDとマネージャーIDの更新を個別に処理
    if (companyId) {
      updateData.company = {
        connect: { id: companyId }
      };
    }

    if (managerId) {
      updateData.manager = {
        connect: { id: managerId }
      };
    } else if (managerId === null) {
      // マネージャーを解除する場合
      updateData.manager = {
        disconnect: true
      };
    }

    // Remove undefined and null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    console.log('Final update data:', updateData);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        position: true,
        companyId: true,
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
        }
      }
    });

    console.log('User updated successfully:', {
      userId: updatedUser.id,
      name: `${updatedUser.firstName} ${updatedUser.lastName}`,
      role: updatedUser.role,
      companyId: updatedUser.company?.id,
      managerId: updatedUser.manager?.id,
      managerName: updatedUser.manager ? `${updatedUser.manager.firstName} ${updatedUser.manager.lastName}` : null
    });

    res.json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Error updating user:', {
      error: error.message,
      stack: error.stack,
      validationErrors: error.errors,
      userId: req.params.userId,
      requestBody: req.body
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