const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize, checkCompanyAccess } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// Validation middleware
const validateProject = [
  body('name').trim().notEmpty().withMessage('プロジェクト名は必須です'),
  body('description').optional().trim(),
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      try {
        const date = new Date(value);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    })
    .withMessage('終了日は有効な日付である必要があります'),
  body('status').isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).withMessage('無効なステータスです'),
  body('managerIds')
    .isArray().withMessage('プロジェクトマネージャーは配列で指定してください')
    .notEmpty().withMessage('プロジェクトマネージャーは必須です')
    .custom(async (value, { req }) => {
      if (!Array.isArray(value) || value.length === 0) return true;
      
      // マネージャーの存在確認
      const managers = await prisma.user.findMany({
        where: { 
          id: { in: value },
          role: 'MANAGER',
          isActive: true
        },
        select: { 
          id: true,
          role: true,
          isActive: true,
          companyId: true
        }
      });

      if (managers.length !== value.length) {
        throw new Error('指定されたマネージャーの一部が見つからないか、無効です');
      }

      // 会社管理者の場合は、マネージャーが同じ会社に所属しているか確認
      if (req.user.role === 'COMPANY') {
        const invalidManager = managers.find(m => m.companyId !== req.user.managedCompanyId);
        if (invalidManager) {
          throw new Error('指定されたマネージャーの一部が異なる会社に所属しています');
        }
      }

      return true;
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

    // 会社管理者の場合は自分の会社のプロジェクトのみを取得
    if (req.user.role === 'COMPANY') {
      if (!req.user.managedCompanyId) {
        throw new AppError('Company manager not associated with any company', 403);
      }
      where.companyId = req.user.managedCompanyId;
    }

    // マネージャーの場合は自分が担当しているプロジェクトのみを取得
    if (req.user.role === 'MANAGER') {
      where.OR = [
        { managerId: req.user.id },
        { members: { some: { userId: req.user.id } } }
      ];
    }

    // メンバーの場合は自分が所属しているプロジェクトのみを取得
    if (req.user.role === 'MEMBER') {
      where.members = {
        some: { userId: req.user.id }
      };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
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
              email: true,
              role: true,
              position: true,
              lastLoginAt: true,
              createdAt: true
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
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where })
    ]);

    // Transform the response to include membership data
    const transformedProjects = projects.map(project => {
      const members = [
        {
          ...project.manager,
          projectMembership: {
            startDate: project.startDate,
            endDate: project.endDate,
            isManager: true
          }
        },
        ...project.members.map(membership => ({
          ...membership.user,
          projectMembership: {
            startDate: membership.startDate,
            endDate: membership.endDate,
            isManager: false
          }
        }))
      ];

      return {
        ...project,
        managers: [project.manager],
        members
      };
    });

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
    console.error('Error fetching projects:', error);
    next(error);
  }
});

// Create new project
router.post('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProject, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));

      console.error('Project creation validation errors:', {
        errors: validationErrors,
        body: req.body,
        user: {
          id: req.user.id,
          role: req.user.role,
          email: req.user.email,
          managedCompanyId: req.user.managedCompanyId
        }
      });

      return res.status(400).json({
        status: 'fail',
        error: {
          message: 'プロジェクトの作成に失敗しました',
          errors: validationErrors,
          requestBody: req.body
        }
      });
    }

    const { name, description, startDate, endDate, status, managerIds, memberIds, companyId: requestCompanyId } = req.body;

    // 会社管理者の場合は自分の会社のプロジェクトのみ作成可能
    let companyId;
    if (req.user.role === 'COMPANY') {
      console.log('Company user creating project:', {
        userId: req.user.id,
        managedCompanyId: req.user.managedCompanyId,
        managedCompany: req.user.managedCompany,
        requestBody: req.body
      });

      if (!req.user.managedCompanyId) {
        throw new AppError('会社管理者が会社に紐付けられていません', 403);
      }

      companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      const manager = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { company: true }
      });
      if (!manager?.company) {
        throw new AppError('マネージャーが会社に紐付けられていません', 403);
      }
      companyId = manager.company.id;
    } else if (req.user.role === 'ADMIN') {
      if (!requestCompanyId) {
        throw new AppError('管理者は会社IDを指定する必要があります', 400);
      }
      companyId = requestCompanyId;
    }

    if (!companyId) {
      throw new AppError('会社IDが必要です', 400);
    }

    // マネージャーの場合は自分をプロジェクトマネージャーとして追加
    const finalManagerIds = req.user.role === 'MANAGER' 
      ? [...new Set([req.user.id, ...(managerIds || [])])]
      : managerIds;

    // マネージャーの存在確認と権限チェック
    const managers = await prisma.user.findMany({
      where: { 
        id: { in: finalManagerIds },
        role: 'MANAGER',
        isActive: true
      },
      select: { 
        id: true,
        role: true,
        isActive: true,
        companyId: true
      }
    });

    console.log('Manager check:', {
      managerIds: finalManagerIds,
      managerFound: managers.length === finalManagerIds.length,
      managerRole: managers.map(m => m.role),
      managerCompanyId: managers.map(m => m.companyId),
      targetCompanyId: companyId,
      managedMembersCount: managers.length,
      requestBody: req.body
    });

    if (managers.length !== finalManagerIds.length) {
      throw new AppError('指定されたマネージャーの一部が見つからないか、無効です', 400);
    }

    // 会社管理者の場合は、マネージャーが同じ会社に所属しているか確認
    if (req.user.role === 'COMPANY') {
      const invalidManager = managers.find(m => m.companyId !== req.user.managedCompanyId);
      if (invalidManager) {
        throw new AppError('指定されたマネージャーの一部が異なる会社に所属しています');
      }
    }

    console.log('Creating project with data:', {
      name,
      description,
      startDate,
      endDate,
      status,
      companyId,
      managerIds: finalManagerIds,
      memberIds,
      createdBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        company: { connect: { id: companyId } },
        managers: {
          create: finalManagerIds.map(id => ({
            user: { connect: { id } },
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null
          }))
        },
        members: {
          create: (memberIds || [])
            .filter(id => !finalManagerIds.includes(id))
            .map(id => ({
              user: { connect: { id } },
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null
            }))
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        managers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true
              }
            }
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

    // Transform the response
    const transformedProject = {
      ...project,
      managers: project.managers.map(m => m.user),
      members: [
        ...project.managers.map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: true
          }
        })),
        ...project.members
          .filter(m => !project.managers.some(manager => manager.userId === m.userId))
          .map(m => ({
            ...m.user,
            projectMembership: {
              startDate: m.startDate,
              endDate: m.endDate,
              isManager: false
            }
          }))
      ]
    };

    res.status(201).json({
      status: 'success',
      data: { project: transformedProject }
    });
  } catch (error) {
    console.error('Project creation error:', {
      error: error.message,
      stack: error.stack,
      validationErrors: error.errors,
      requestBody: error.requestBody,
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

// Update project
router.patch('/:projectId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProject, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));

      console.error('Project update validation errors:', {
        errors: validationErrors,
        body: req.body,
        projectId: req.params.projectId,
        user: {
          id: req.user.id,
          role: req.user.role,
          email: req.user.email,
          managedCompanyId: req.user.managedCompanyId
        }
      });

      return res.status(400).json({
        status: 'fail',
        error: {
          message: 'Validation failed',
          errors: validationErrors,
          requestBody: req.body
        }
      });
    }

    const { projectId } = req.params;
    const { name, description, startDate, endDate, status, managerIds, memberIds } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        company: true,
        managers: {
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

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY') {
      if (project.company.id !== req.user.managedCompanyId) {
        throw new AppError('You can only update projects in your company', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (project.company.id !== req.user.companyId) {
        throw new AppError('You can only update projects in your company', 403);
      }
      if (!project.managers.some(m => m.userId === req.user.id)) {
        throw new AppError('You can only update projects you manage', 403);
      }
    }

    console.log('Updating project:', {
      projectId,
      currentData: {
        name: project.name,
        status: project.status,
        companyId: project.companyId,
        managerIds: project.managers.map(m => m.userId),
        memberCount: project.members.length
      },
      updateData: {
        name,
        status,
        managerIds,
        memberCount: memberIds?.length
      },
      updatedBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
        managedCompanyId: req.user.managedCompanyId
      }
    });

    const updateData = {
      name,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status
    };

    // マネージャーの更新（会社管理者のみ可能）
    if (req.user.role !== 'MANAGER' && managerIds) {
      // 既存のマネージャーを削除
      await prisma.projectManager.deleteMany({
        where: { projectId }
      });

      // 新しいマネージャーを追加
      await prisma.projectManager.createMany({
        data: managerIds.map(id => ({
          projectId,
          userId: id,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null
        }))
      });
    }

    // メンバーの更新（マネージャーは常に含める）
    if (memberIds) {
      const finalMemberIds = [...new Set([...memberIds, ...managerIds])];
      await prisma.projectMembership.deleteMany({
        where: { projectId }
      });
      await prisma.projectMembership.createMany({
        data: finalMemberIds.map(id => ({
          projectId,
          userId: id,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null
        }))
      });
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
        managers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true
              }
            }
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

    // Transform the response to include membership data
    const transformedProject = {
      ...updatedProject,
      managers: updatedProject.managers.map(m => m.user),
      members: [
        ...updatedProject.managers.map(m => ({
          ...m.user,
          projectMembership: {
            startDate: m.startDate,
            endDate: m.endDate,
            isManager: true
          }
        })),
        ...updatedProject.members
          .filter(m => !updatedProject.managers.some(manager => manager.userId === m.userId))
          .map(m => ({
            ...m.user,
            projectMembership: {
              startDate: m.startDate,
              endDate: m.endDate,
              isManager: false
            }
          }))
      ]
    };

    res.json({
      status: 'success',
      data: { project: transformedProject }
    });
  } catch (error) {
    console.error('Project update error:', {
      error: error.message,
      stack: error.stack,
      validationErrors: error.errors,
      requestBody: error.requestBody,
      projectId: req.params.projectId,
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

// Delete project
router.delete('/:projectId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        company: true,
        managers: {
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

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY') {
      if (project.company.id !== req.user.managedCompany.id) {
        throw new AppError('You can only delete projects in your company', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (project.company.id !== req.user.companyId) {
        throw new AppError('You can only delete projects in your company', 403);
      }
      if (project.managers.some(m => m.userId !== req.user.id)) {
        throw new AppError('You can only delete projects you manage', 403);
      }
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({
      status: 'success',
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Add members to project
router.post('/:projectId/members', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds)) {
      throw new AppError('memberIds must be an array', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        company: true,
        managers: {
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

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY') {
      if (project.company.id !== req.user.managedCompany.id) {
        throw new AppError('You can only manage members in your company projects', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (project.company.id !== req.user.companyId) {
        throw new AppError('You can only manage members in your company projects', 403);
      }
      if (project.managers.some(m => m.userId !== req.user.id)) {
        throw new AppError('You can only manage members in projects you manage', 403);
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        members: {
          connect: memberIds.map(id => ({ id }))
        }
      },
      include: {
        managers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true
              }
            }
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
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Transform the response to include membership data
    const transformedProject = {
      ...updatedProject,
      managers: updatedProject.managers.map(m => m.user),
      members: updatedProject.members.map(membership => ({
        ...membership.user,
        projectMembership: {
          startDate: membership.startDate,
          endDate: membership.endDate
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

// Remove members from project
router.delete('/:projectId/members', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds)) {
      throw new AppError('memberIds must be an array', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        company: true,
        managers: {
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

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // 権限チェック
    if (req.user.role === 'COMPANY') {
      if (project.company.id !== req.user.managedCompany.id) {
        throw new AppError('You can only manage members in your company projects', 403);
      }
    } else if (req.user.role === 'MANAGER') {
      if (project.company.id !== req.user.companyId) {
        throw new AppError('You can only manage members in your company projects', 403);
      }
      if (project.managers.some(m => m.userId !== req.user.id)) {
        throw new AppError('You can only manage members in projects you manage', 403);
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        members: {
          disconnect: memberIds.map(id => ({ id }))
        }
      },
      include: {
        managers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                position: true
              }
            }
          }
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
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
      data: { project: updatedProject }
    });
  } catch (error) {
    next(error);
  }
});

// プロジェクトメンバーの期間を更新
router.patch('/:projectId/members/:userId/period', authenticate, async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { startDate, endDate } = req.body;
    const { user: currentUser } = req;

    // プロジェクトの存在確認と権限チェック
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        managers: {
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

    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    // 権限チェック
    const canEdit = 
      currentUser.role === 'ADMIN' ||
      (currentUser.role === 'COMPANY' && currentUser.managedCompany?.id === project.companyId) ||
      (currentUser.role === 'MANAGER' && currentUser.id === project.managers.find(m => m.userId)?.userId);

    if (!canEdit) {
      return res.status(403).json({ error: 'この操作を実行する権限がありません' });
    }

    // メンバーシップの存在確認
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ error: '指定されたメンバーはこのプロジェクトに所属していません' });
    }

    // 日付のバリデーション
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: '開始日は終了日より前である必要があります' });
    }

    // メンバーシップの更新
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
            position: true
          }
        }
      }
    });

    res.json({
      data: {
        membership: updatedMembership,
        message: 'メンバーの期間を更新しました'
      }
    });
  } catch (error) {
    console.error('Error updating member period:', error);
    next(error);
  }
});

module.exports = router; 