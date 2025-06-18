const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/authentication');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateUserUpdate = [
  body('firstName').optional().trim().notEmpty().withMessage('名前（名）は必須です'),
  body('lastName').optional().trim().notEmpty().withMessage('名前（姓）は必須です'),
  body('email').optional().isEmail().normalizeEmail().withMessage('有効なメールアドレスを入力してください'),
  body('role').optional().isIn(['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']).withMessage('無効なロールです'),
  body('isActive').optional().isBoolean().withMessage('isActiveは真偽値である必要があります'),
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

    const userData = {
      ...user,
      managedCompanyId: user.managedCompany?.id || null,
      managedCompanyName: user.managedCompany?.name || null
    };

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

// Get all users (COMPANY and MANAGER only - ADMIN cannot access customer data)
router.get('/', authenticate, authorize('COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, include, companyId } = req.query;
    const userRole = req.user.role;

    // Build where condition based on user role and company access
    let where = {};
    
    if (userRole === 'COMPANY') {
      // COMPANY role can only see users from their managed company
      if (!req.user.managedCompanyId) {
        throw new AppError('管理している会社が見つかりません', 403);
      }
      where.companyId = req.user.managedCompanyId;
    } else if (userRole === 'MANAGER') {
      // MANAGER role can only see users from their own company
      if (!req.user.companyId) {
        throw new AppError('会社が見つかりません', 403);
      }
      where.companyId = req.user.companyId;
    }

    // Base select fields
    const selectFields = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      position: true
    };

    // Add company and skills if requested
    const includeFields = {};
    if (include) {
      const includeList = Array.isArray(include) ? include : include.split(',');
      
      if (includeList.includes('company')) {
        includeFields.company = {
          select: {
            id: true,
            name: true
          }
        };
      }
        if (includeList.includes('skills')) {
        includeFields.userSkills = {
          select: {
            id: true,
            years: true,
            level: true,
            companySelectedSkillId: true,
            companySelectedSkill: {
              select: {
                id: true,
                skillName: true,    // 独自スキル名
                category: true,     // 独自スキルカテゴリ
                description: true,  // 独自スキル説明
                isCustom: true,     // 独自スキルフラグ
                globalSkill: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              }
            }
          }
        };
      }
    }    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),        select: {
          ...selectFields,
          ...(includeFields.company && {
            company: includeFields.company
          }),
          ...(includeFields.userSkills && {
            userSkills: includeFields.userSkills
          })
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

// Create new employee (COMPANY only)
router.post('/', authenticate, authorize('COMPANY'), async (req, res, next) => {
  try {
    const { email, firstName, lastName, role = 'MEMBER', phone, prefecture, city, streetAddress, skills = [] } = req.body;
    
    // COMPANY権限は自社にのみ追加可能
    if (!req.user.managedCompanyId) {
      throw new AppError('管理している会社が見つかりません', 403);
    }

    // 一時パスワード生成
    const tempPassword = Math.random().toString(36).slice(-8) + 'Tmp!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userData = {
      email,
      firstName,
      lastName,
      role,
      password: hashedPassword,
      isEmailVerified: false,
      companyId: req.user.managedCompanyId,
      phone,
      prefecture,
      city,
      streetAddress
    };

    const newUser = await prisma.user.create({
      data: userData,
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    });

    // スキル情報の処理（skillsが提供された場合）
    if (skills && Array.isArray(skills)) {
      for (const skill of skills) {
        if (skill.skillId || skill.companySelectedSkillId) {
          await prisma.userSkill.create({
            data: {
              userId: newUser.id,
              // 新システムではcompanySelectedSkillIdのみ使用
              companySelectedSkillId: skill.companySelectedSkillId || skill.skillId,
              years: parseInt(skill.years) || 0
            }
          });
        }
      }
    }

    res.status(201).json({
      status: 'success',
      data: { user: newUser, tempPassword },
      message: '社員を追加しました'
    });
  } catch (error) {
    next(error);
  }
});

// Update employee (COMPANY for all changes, MANAGER for limited changes)
router.patch('/:id', authenticate, authorize('COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    
    // 更新対象ユーザーの確認
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true, role: true }
    });

    if (!targetUser) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // 権限チェック
    if (userRole === 'COMPANY') {
      // COMPANY権限は自社の社員のみ編集可能
      if (targetUser.companyId !== req.user.managedCompanyId) {
        throw new AppError('他社の社員は編集できません', 403);
      }
    } else if (userRole === 'MANAGER') {
      // MANAGER権限は自社の社員のみ編集可能（権限変更は不可）
      if (targetUser.companyId !== req.user.companyId) {
        throw new AppError('他社の社員は編集できません', 403);
      }
      // MANAGERはrole変更不可
      if (req.body.role && req.body.role !== targetUser.role) {
        throw new AppError('権限の変更はできません', 403);
      }
    }

    // skillsを分離（Userモデルに直接含められないため）
    const { skills, ...userData } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: userData,
      include: {
        company: {
          select: { id: true, name: true }
        }
      }
    });

    // スキル情報の更新（skillsが提供された場合）
    if (skills && Array.isArray(skills)) {
      // 既存のUserSkillを削除
      await prisma.userSkill.deleteMany({
        where: { userId: id }
      });

      // 新しいスキルを追加
      for (const skill of skills) {
        if (skill.skillId || skill.companySelectedSkillId) {
          await prisma.userSkill.create({
            data: {
              userId: id,
              // 新システムではcompanySelectedSkillIdのみ使用
              companySelectedSkillId: skill.companySelectedSkillId || skill.skillId,
              years: parseInt(skill.years) || 0
            }
          });
        }
      }
    }

    res.json({
      status: 'success',
      data: { user: updatedUser },
      message: '社員情報を更新しました'
    });
  } catch (error) {
    next(error);
  }
});

// Delete employee (COMPANY only)
router.delete('/:id', authenticate, authorize('COMPANY'), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 削除対象ユーザーの確認
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, companyId: true, role: true }
    });

    if (!targetUser) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // COMPANY権限は自社の社員のみ削除可能
    if (targetUser.companyId !== req.user.managedCompanyId) {
      throw new AppError('他社の社員は削除できません', 403);
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: '社員を削除しました'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
