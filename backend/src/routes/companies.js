const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateCompany = [
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('website').optional().trim().isURL(),
  body('isActive').optional().isBoolean()
];

// Get all companies (admin only or company manager: only own company)
router.get('/', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive, include } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (req.user.role === 'COMPANY') {
      // 自分が管理している会社のみ
      where.managerId = req.user.id;
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          _count: {
            select: { users: true }
          },
          manager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          users: include === 'users' ? {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              position: true,
              managerId: true
            }
          } : undefined
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.company.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        companies,
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

// Get company details
router.get('/:companyId', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { users: true }
        },
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check access permissions
    if (req.user.role === 'COMPANY' && company.manager.id !== req.user.id) {
      throw new AppError('You do not have access to this company', 403);
    }

    res.json({
      status: 'success',
      data: { company }
    });
  } catch (error) {
    next(error);
  }
});

// Create new company (admin only)
router.post('/', authenticate, authorize('ADMIN'), validateCompany, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { name, description, address, phone, website, managerId } = req.body;

    // Check if manager exists and is a company manager
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!manager || manager.role !== 'COMPANY') {
        throw new AppError('Invalid manager ID or user is not a company manager', 400);
      }

      // Check if manager is already assigned to a company
      if (manager.managedCompany) {
        throw new AppError('Manager is already assigned to a company', 400);
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        description,
        address,
        phone,
        website,
        manager: managerId ? {
          connect: { id: managerId }
        } : undefined
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { company }
    });
  } catch (error) {
    next(error);
  }
});

// Update company (admin or company manager)
router.patch('/:companyId', authenticate, authorize('ADMIN', 'COMPANY'), validateCompany, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { companyId } = req.params;
    const { name, description, address, phone, website, isActive, managerId } = req.body;

    // Get company to update
    const companyToUpdate = await prisma.company.findUnique({
      where: { id: companyId },
      include: { manager: true }
    });

    if (!companyToUpdate) {
      throw new AppError('Company not found', 404);
    }

    // Check access permissions
    if (req.user.role === 'COMPANY' && companyToUpdate.manager.id !== req.user.id) {
      throw new AppError('You can only update your own company', 403);
    }

    // Check if new manager exists and is a company manager
    if (managerId && managerId !== companyToUpdate.manager?.id) {
      const newManager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!newManager || newManager.role !== 'COMPANY') {
        throw new AppError('Invalid manager ID or user is not a company manager', 400);
      }

      // Check if manager is already assigned to a company
      if (newManager.managedCompany) {
        throw new AppError('Manager is already assigned to a company', 400);
      }
    }

    // Company managers can't change isActive status
    if (req.user.role === 'COMPANY') {
      delete req.body.isActive;
      delete req.body.managerId;
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        description,
        address,
        phone,
        website,
        isActive,
        manager: managerId ? {
          connect: { id: managerId }
        } : undefined
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { company: updatedCompany }
    });
  } catch (error) {
    next(error);
  }
});

// Delete company (admin only)
router.delete('/:companyId', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check if company has users
    if (company._count.users > 0) {
      throw new AppError('Cannot delete company with active users', 400);
    }

    // Soft delete company
    await prisma.company.update({
      where: { id: companyId },
      data: { isActive: false }
    });

    res.json({
      status: 'success',
      message: 'Company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 