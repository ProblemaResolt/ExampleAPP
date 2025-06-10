const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const prisma = require('../lib/prisma');

const router = express.Router();

// Project validation middleware
const validateProjectCreate = [
  body('name').trim().notEmpty().withMessage('プロジェクト名は必須です'),
  body('description').optional().trim(),
  body('clientCompanyName').optional().trim(),
  body('clientContactName').optional().trim(),
  body('clientContactPhone').optional().trim(),
  body('clientContactEmail').optional().trim().isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate').optional().isISO8601().withMessage('終了日は有効な日付である必要があります'),
  body('status').isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).withMessage('無効なステータスです'),
  body('managerIds').isArray().notEmpty().withMessage('最低1人のマネージャーが必要です')
];

// Get all projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, companyId } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (status) where.status = status;
    if (companyId) where.companyId = parseInt(companyId);

    // Role-based filtering
    if (req.user.role === 'COMPANY') {
      where.companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'USER') {
      where.companyId = req.user.companyId;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          company: {
            select: { id: true, name: true }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          _count: {
            select: { assignments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        projects,
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

// Get project by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        company: {
          select: { id: true, name: true }
        },
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                skills: {
                  include: {
                    skill: {
                      select: {
                        id: true,
                        name: true,
                        category: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // Permission check
    if (req.user.role === 'COMPANY' && project.companyId !== req.user.managedCompanyId) {
      throw new AppError('権限がありません', 403);
    }
    if (req.user.role === 'USER' && project.companyId !== req.user.companyId) {
      throw new AppError('権限がありません', 403);
    }

    res.json({
      status: 'success',
      data: { project }
    });
  } catch (error) {
    next(error);
  }
});

// Create new project
router.post('/', authenticate, authorize(['ADMIN', 'COMPANY']), validateProjectCreate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const { managerIds, ...projectData } = req.body;

    // Set company ID based on user role
    if (req.user.role === 'COMPANY') {
      projectData.companyId = req.user.managedCompanyId;
    }

    const project = await prisma.project.create({
      data: {
        ...projectData,
        managers: {
          connect: managerIds.map(id => ({ id: parseInt(id) }))
        }
      },
      include: {
        company: {
          select: { id: true, name: true }
        },
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { project },
      message: 'プロジェクトが作成されました'
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', authenticate, authorize(['ADMIN', 'COMPANY']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { managerIds, ...updateData } = req.body;

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProject) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    if (req.user.role === 'COMPANY' && existingProject.companyId !== req.user.managedCompanyId) {
      throw new AppError('権限がありません', 403);
    }

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        ...(managerIds && {
          managers: {
            set: managerIds.map(id => ({ id: parseInt(id) }))
          }
        })
      },
      include: {
        company: {
          select: { id: true, name: true }
        },
        managers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { project },
      message: 'プロジェクトが更新されました'
    });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', authenticate, authorize(['ADMIN', 'COMPANY']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingProject) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    if (req.user.role === 'COMPANY' && existingProject.companyId !== req.user.managedCompanyId) {
      throw new AppError('権限がありません', 403);
    }

    await prisma.project.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: 'プロジェクトが削除されました'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
