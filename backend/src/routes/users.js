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
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['COMPANY', 'MANAGER', 'MEMBER']),
  body('isActive').optional().isBoolean()
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

// Get all users (admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
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
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true
            }
          }
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
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive, companyId } = req.body;

    // Get user to update
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!userToUpdate) {
      throw new AppError('User not found', 404);
    }

    // Check company access for company managers
    if (req.user.role === 'COMPANY') {
      if (userToUpdate.company.id !== req.user.managedCompany.id) {
        throw new AppError('You can only update users in your company', 403);
      }
      // Company managers can't change roles or company
      delete req.body.role;
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        role,
        isActive,
        companyId,
        isEmailVerified: email !== userToUpdate.email ? false : undefined
      },
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
        }
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