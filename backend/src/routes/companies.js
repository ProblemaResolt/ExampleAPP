const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const CompanyValidator = require('../validators/CompanyValidator');

const router = express.Router();
const prisma = new PrismaClient();

// Get all companies
router.get('/', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, isActive, include } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (req.user.role === 'COMPANY') {
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

// Get company's stats
router.get('/my-stats', authenticate, authorize('COMPANY'), async (req, res, next) => {
  try {
    const companyId = req.user.managedCompanyId;
    
    if (!companyId) {
      throw new AppError('管理している会社が見つかりません', 403);
    }

    const companyEmployees = await prisma.user.count({
      where: { 
        companyId: companyId,
        isActive: true
      }
    });

    const companyProjects = await prisma.project.count({
      where: { companyId: companyId }
    });

    const todayAttendance = await prisma.timeEntry.count({
      where: {
        user: { companyId: companyId },
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        employees: companyEmployees,
        projects: companyProjects,
        todayAttendance: todayAttendance
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get company by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { include } = req.query;

    // Permission check
    if (req.user.role !== 'ADMIN' && req.user.companyId !== parseInt(id) && req.user.managedCompanyId !== parseInt(id)) {
      throw new AppError('権限がありません', 403);
    }

    const company = await prisma.company.findUnique({
      where: { id: parseInt(id) },
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
            position: true
          }
        } : undefined
      }
    });

    if (!company) {
      throw new AppError('会社が見つかりません', 404);
    }

    res.json({
      status: 'success',
      data: { company }
    });
  } catch (error) {
    next(error);
  }
});

// Create new company
router.post('/', authenticate, authorize('ADMIN'), CompanyValidator.create, async (req, res, next) => {
  try {
    CommonValidationRules.handleValidationErrors(req);

    const company = await prisma.company.create({
      data: req.body,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { company },
      message: '会社が作成されました'
    });
  } catch (error) {
    next(error);
  }
});

// Update company
router.put('/:id', authenticate, authorize('ADMIN', 'COMPANY'), CompanyValidator.update, async (req, res, next) => {
  try {
    const { id } = req.params;
    CommonValidationRules.handleValidationErrors(req);

    // Permission check for COMPANY role
    if (req.user.role === 'COMPANY' && req.user.managedCompanyId !== parseInt(id)) {
      throw new AppError('権限がありません', 403);
    }

    const company = await prisma.company.update({
      where: { id: parseInt(id) },
      data: req.body,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: { company },
      message: '会社情報が更新されました'
    });
  } catch (error) {
    next(error);
  }
});

// Delete company
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.company.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: '会社が削除されました'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;