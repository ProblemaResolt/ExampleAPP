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

// Get all users (with company-based filtering)
router.get('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, include, companyId } = req.query;
    const userRole = req.user.role;



    // Build where condition based on user role and company access
    let where = {};
    
    if (userRole === 'ADMIN') {
      // ADMIN can access all users, optionally filtered by companyId
      if (companyId) {
        where.companyId = parseInt(companyId);
      }
      // デフォルトでは全ユーザーにアクセス可能（システム管理者用）
    } else if (userRole === 'COMPANY') {
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
        includeFields.skills = {
          include: {
            companySelectedSkill: {
              include: {
                globalSkill: true
              }
            }
          }
        };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: parseInt(limit),
        select: selectFields,
        include: includeFields,
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

module.exports = router;
