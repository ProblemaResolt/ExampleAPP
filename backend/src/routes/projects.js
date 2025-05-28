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
      // 値が null, undefined, 空文字列の場合は常に許可
      if (value === null || value === undefined || value === '') {
        return true;
      }
      // 値が存在する場合のみ日付形式をチェック
      try {
        const date = new Date(value);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    })
    .withMessage('終了日は有効な日付である必要があります'),
  body('status').isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).withMessage('無効なステータスです'),
  body('managerId')
    .notEmpty().withMessage('プロジェクトマネージャーは必須です')
    .custom(async (value, { req }) => {
      if (!value) return true;
      
      // マネージャーの存在確認
      const manager = await prisma.user.findUnique({
        where: { id: value },
        select: { 
          id: true,
          role: true,
          isActive: true,
          companyId: true
        }
      });

      if (!manager) {
        throw new Error('指定されたマネージャーが見つかりません');
      }

      if (manager.role !== 'MANAGER') {
        throw new Error('指定されたユーザーはマネージャーではありません');
      }

      if (!manager.isActive) {
        throw new Error('指定されたマネージャーは無効なアカウントです');
      }

      // 会社管理者の場合は、マネージャーが同じ会社に所属しているか確認
      if (req.user.role === 'COMPANY' && manager.companyId !== req.user.managedCompanyId) {
        throw new Error('指定されたマネージャーは異なる会社に所属しています');
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
      console.log('Company user fetching projects:', {
        userId: req.user.id,
        managedCompanyId: req.user.managedCompanyId,
        managedCompany: req.user.managedCompany
      });

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

    console.log('Fetching projects with conditions:', {
      where,
      skip,
      limit,
      userRole: req.user.role,
      userId: req.user.id,
      managedCompanyId: req.user.managedCompanyId
    });

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
              email: true
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
    const transformedProjects = projects.map(project => ({
      ...project,
      members: project.members.map(membership => ({
        ...membership.user,
        projectMembership: {
          startDate: membership.startDate,
          endDate: membership.endDate
        }
      }))
    }));

    console.log('Projects fetched successfully:', {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      projectCount: projects.length,
      userRole: req.user.role,
      userId: req.user.id,
      managedCompanyId: req.user.managedCompanyId
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
    console.error('Error fetching projects:', {
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

    const { name, description, startDate, endDate, status, managerId, memberIds, companyId: requestCompanyId } = req.body;

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

    // マネージャーの場合は自分をプロジェクトマネージャーとして設定
    const finalManagerId = req.user.role === 'MANAGER' ? req.user.id : managerId;

    if (!finalManagerId) {
      throw new AppError('プロジェクトマネージャーを指定してください', 400);
    }

    // マネージャーの存在確認と権限チェック
    const manager = await prisma.user.findUnique({
      where: { id: finalManagerId },
      include: { 
        company: true,
        managedMembers: {
          select: {
            id: true
          }
        }
      }
    });

    console.log('Manager check:', {
      managerId: finalManagerId,
      managerFound: !!manager,
      managerRole: manager?.role,
      managerCompanyId: manager?.company?.id,
      targetCompanyId: companyId,
      managedMembersCount: manager?.managedMembers?.length,
      requestBody: req.body
    });

    if (!manager) {
      throw new AppError(`指定されたマネージャー（ID: ${finalManagerId}）が見つかりません`, 400);
    }

    if (manager.role !== 'MANAGER') {
      throw new AppError(`指定されたユーザー（ID: ${finalManagerId}）はマネージャーではありません。現在のロール: ${manager.role}`, 400);
    }

    // マネージャーが同じ会社に所属しているか確認
    if (manager.company?.id !== companyId) {
      throw new AppError(`指定されたマネージャー（ID: ${finalManagerId}）は異なる会社に所属しています。マネージャーの会社ID: ${manager.company?.id}, プロジェクトの会社ID: ${companyId}`, 400);
    }

    // マネージャーが有効なアカウントか確認
    if (!manager.isActive) {
      throw new AppError(`指定されたマネージャー（ID: ${finalManagerId}）は無効なアカウントです`, 400);
    }

    console.log('Creating project with data:', {
      name,
      description,
      startDate,
      endDate,
      status,
      companyId,
      managerId: finalManagerId,
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
        manager: { connect: { id: finalManagerId } },
        members: memberIds ? {
          create: memberIds.map(id => ({
            user: { connect: { id } },
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null
          }))
        } : undefined
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            position: true
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
      ...project,
      members: project.members.map(membership => ({
        ...membership.user,
        projectMembership: {
          startDate: membership.startDate,
          endDate: membership.endDate
        }
      }))
    };

    console.log('Project created successfully:', {
      projectId: project.id,
      name: project.name,
      companyId: project.companyId,
      managerId: project.managerId,
      memberCount: project.members.length,
      members: transformedProject.members.map(m => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        role: m.role,
        startDate: m.projectMembership.startDate,
        endDate: m.projectMembership.endDate
      }))
    });

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
    const { name, description, startDate, endDate, status, managerId, memberIds } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { 
        company: true,
        manager: true,
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
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
      if (project.manager.id !== req.user.id) {
        throw new AppError('You can only update projects you manage', 403);
      }
    }

    console.log('Updating project:', {
      projectId,
      currentData: {
        name: project.name,
        status: project.status,
        companyId: project.companyId,
        managerId: project.managerId,
        memberCount: project.members.length
      },
      updateData: {
        name,
        status,
        managerId,
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
    if (req.user.role !== 'MANAGER' && managerId) {
      updateData.manager = { connect: { id: managerId } };
    }

    // メンバーの更新
    if (memberIds) {
      updateData.members = {
        set: memberIds.map(id => ({ id }))
      };
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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

    console.log('Project updated successfully:', {
      projectId: updatedProject.id,
      name: updatedProject.name,
      companyId: updatedProject.companyId,
      managerId: updatedProject.managerId,
      memberCount: updatedProject.members.length,
      updatedBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
        managedCompanyId: req.user.managedCompanyId
      }
    });

    res.json({
      status: 'success',
      data: { project: updatedProject }
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
        manager: true
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
      if (project.manager.id !== req.user.id) {
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
        manager: true
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
      if (project.manager.id !== req.user.id) {
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
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
        manager: true
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
      if (project.manager.id !== req.user.id) {
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
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
        manager: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }

    // 権限チェック
    const canEdit = 
      currentUser.role === 'ADMIN' ||
      (currentUser.role === 'COMPANY' && currentUser.managedCompany?.id === project.companyId) ||
      (currentUser.role === 'MANAGER' && currentUser.id === project.managerId);

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