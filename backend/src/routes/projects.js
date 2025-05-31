const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// Project validation middleware
const validateProject = [
  body('name').trim().notEmpty().withMessage('プロジェクト名は必須です'),
  body('description').optional().trim(),
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('終了日は有効な日付である必要があります'),
  body('status')
    .isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .withMessage('無効なステータスです'),
  body('managerIds')
    .isArray()
    .notEmpty()
    .withMessage('プロジェクトマネージャーは必須です')
    .custom(async (value, { req }) => {
      try {
        const managers = await prisma.user.findMany({
          where: {
            id: { in: value },
            role: 'MANAGER',
            isActive: true
          },
          select: {
            id: true,
            companyId: true
          }
        });

        if (managers.length !== value.length) {
          throw new Error('指定されたマネージャーの一部が見つからないか、無効です');
        }

        if (req.user.role === 'COMPANY' && req.user.managedCompanyId) {
          const invalidManager = managers.find(m => m.companyId !== req.user.managedCompanyId);
          if (invalidManager) {
            throw new Error('指定されたマネージャーの一部が異なる会社に所属しています');
          }
        }

        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    })
];

// Get all projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;

    if (req.user.role === 'COMPANY') {
      where.companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      where.members = {
        some: {
          userId: req.user.id,
          isManager: true
        }
      };
    } else if (req.user.role === 'MEMBER') {
      where.members = {
        some: {
          userId: req.user.id
        }
      };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true
            }
          },
          members: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              projectId: true,
              userId: true,
              isManager: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  position: true,
                  lastLoginAt: true,
                  createdAt: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.project.count({ where })
    ]);

    const transformedProjects = projects.map(project => ({
      ...project,
      managers: project.members
        .filter(m => m.isManager === true)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: true
          }
        })),
      members: project.members
        .filter(m => m.isManager === false)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: false
          }
        }))
    }));

    res.json({
      status: 'success',
      data: {
        projects: transformedProjects,
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

// Create project
router.post('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProject, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('入力データが無効です', 400, errors.array());
    }

    const { name, description, startDate, endDate, status, managerIds, memberIds } = req.body;

    let companyId;
    if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else {
      // Get company ID from the first manager
      const manager = await prisma.user.findFirst({
        where: { id: managerIds[0] },
        select: { companyId: true }
      });
      companyId = manager?.companyId;
    }

    if (!companyId) {
      throw new AppError('会社情報が見つかりません', 404);
    }

    // Create project memberships
    const memberships = [];

    // Add managers
    if (managerIds?.length > 0) {
      const managerMemberships = managerIds.map(userId => ({
        userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isManager: true
      }));
      memberships.push(...managerMemberships);
    }

    // Add members
    if (memberIds?.length > 0) {
      const memberMemberships = memberIds.map(userId => ({
        userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isManager: false
      }));
      memberships.push(...memberMemberships);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        company: { connect: { id: companyId } },
        members: {
          create: memberships
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true,
                lastLoginAt: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    const transformedProject = {
      ...project,
      managers: project.members
        .filter(m => m.isManager)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: true
          }
        })),
      members: project.members
        .filter(m => !m.isManager)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: false
          }
        }))
    };

    res.status(201).json({
      status: 'success',
      data: { project: transformedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.patch('/:projectId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProject, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;
    const { name, description, startDate, endDate, status, managerIds, memberIds } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        members: true
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // Check permissions
    if (req.user.role === 'COMPANY' && project.company.id !== req.user.managedCompanyId) {
      throw new AppError('このプロジェクトを編集する権限がありません', 403);
    } else if (req.user.role === 'MANAGER') {
      const isProjectManager = project.members.some(m => m.userId === req.user.id && m.isManager);
      if (!isProjectManager) {
        throw new AppError('このプロジェクトを編集する権限がありません', 403);
      }
    }

    const updateData = {
      name,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status
    };

    // Update memberships
    if (memberIds || managerIds) {
      // Delete existing memberships
      await prisma.projectMembership.deleteMany({
        where: { projectId }
      });

      const memberships = [];

      // Add managers
      if (managerIds?.length > 0) {
        memberships.push(...managerIds.map(id => ({
          userId: id,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          isManager: true
        })));
      }

      // Add members
      if (memberIds?.length > 0) {
        memberships.push(...memberIds
          .filter(id => !managerIds?.includes(id))
          .map(id => ({
            userId: id,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            isManager: false
          })));
      }

      // Create new memberships
      updateData.members = {
        create: memberships
      };
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true,
                lastLoginAt: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    const transformedProject = {
      ...updatedProject,
      managers: updatedProject.members
        .filter(m => m.isManager)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: true
          }
        })),
      members: updatedProject.members
        .filter(m => !m.isManager)
        .map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: false
          }
        }))
    };

    res.json({
      status: 'success',
      data: { project: transformedProject }
    });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:projectId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        members: {
          where: { isManager: true }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    if (req.user.role === 'COMPANY' && project.company.id !== req.user.managedCompanyId) {
      throw new AppError('このプロジェクトを削除する権限がありません', 403);
    } else if (req.user.role === 'MANAGER' && !project.members.some(m => m.userId === req.user.id)) {
      throw new AppError('このプロジェクトを削除する権限がありません', 403);
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({
      status: 'success',
      message: 'プロジェクトを削除しました'
    });
  } catch (error) {
    next(error);
  }
});

// Update member period
router.patch('/:projectId/members/:userId/period', authenticate, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { startDate, endDate } = req.body;

    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      include: {
        project: {
          include: {
            company: true
          }
        }
      }
    });

    if (!membership) {
      throw new AppError('メンバーシップが見つかりません', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY' && membership.project.company.id !== req.user.managedCompanyId) {
      throw new AppError('このメンバーの期間を更新する権限がありません', 403);
    } else if (req.user.role === 'MANAGER') {
      const managerMembership = await prisma.projectMembership.findFirst({
        where: {
          projectId,
          userId: req.user.id,
          isManager: true
        }
      });
      if (!managerMembership) {
        throw new AppError('このメンバーの期間を更新する権限がありません', 403);
      }
    }

    // 日付のバリデーション
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new AppError('開始日は終了日より前である必要があります', 400);
    }

    // プロジェクトの期間内であることを確認
    if (startDate && membership.project.endDate && new Date(startDate) > membership.project.endDate) {
      throw new AppError('開始日はプロジェクトの終了日以前である必要があります', 400);
    }
    if (endDate && membership.project.startDate && new Date(endDate) < membership.project.startDate) {
      throw new AppError('終了日はプロジェクトの開始日以降である必要があります', 400);
    }

    const updatedMembership = await prisma.projectMembership.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            position: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      }
    });

    const memberData = {
      ...updatedMembership.user,
      projectMembership: {
        startDate: updatedMembership.startDate,
        endDate: updatedMembership.endDate,
        isManager: updatedMembership.isManager
      }
    };

    res.json({
      status: 'success',
      data: {
        member: memberData,
        message: 'メンバーの期間を更新しました'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add project member
router.post('/:projectId/members', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        members: {
          where: { userId, isManager: false }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY' && project.company.id !== req.user.managedCompanyId) {
      throw new AppError('このプロジェクトにメンバーを追加する権限がありません', 403);
    } else if (req.user.role === 'MANAGER') {
      const isProjectManager = await prisma.projectMembership.findFirst({
        where: {
          projectId,
          userId: req.user.id,
          isManager: true
        }
      });
      if (!isProjectManager) {
        throw new AppError('このプロジェクトにメンバーを追加する権限がありません', 403);
      }
    }

    // 既存メンバーチェック
    if (project.members.length > 0) {
      throw new AppError('このユーザーは既にプロジェクトのメンバーです', 400);
    }

    // メンバーの追加
    const membership = await prisma.projectMembership.create({
      data: {
        userId,
        projectId,
        startDate: new Date(),
        isManager: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            position: true,
            lastLoginAt: true,
            createdAt: true
          }
        }
      }
    });

    const memberData = {
      ...membership.user,
      projectMembership: {
        startDate: membership.startDate,
        endDate: membership.endDate,
        isManager: membership.isManager
      }
    };

    res.status(201).json({
      status: 'success',
      data: {
        member: memberData
      }
    });
  } catch (error) {
    next(error);
  }
});

// プロジェクトメンバーの削除
router.delete('/:projectId/members/:memberId', async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    // メンバーの存在確認
    const member = await prisma.projectMembership.findUnique({
      where: {
        id: memberId,
        projectId: projectId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'メンバーが見つかりません' });
    }

    // メンバーの削除
    await prisma.projectMembership.delete({
      where: {
        id: memberId
      }
    });

    res.status(200).json({ message: 'メンバーを削除しました' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;