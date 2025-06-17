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
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate').optional().isISO8601().withMessage('終了日は有効な日付である必要があります'),
  body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ACTIVE']).withMessage('無効なステータスです'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('無効な優先度です'),
  body('managerIds').optional().isArray().withMessage('マネージャーIDは配列である必要があります'),
  body('managerIds.*').isString().withMessage('マネージャーIDは文字列である必要があります'),
  // クライアント情報フィールドを追加
  body('clientCompanyName').optional().trim(),
  body('clientContactName').optional().trim(),
  body('clientContactPhone').optional().trim(),
  body('clientContactEmail').optional().isEmail().withMessage('無効なメールアドレスです'),
  body('clientPrefecture').optional().trim(),
  body('clientCity').optional().trim(),
  body('clientStreetAddress').optional().trim(),
  // その他のフィールド  body('companyId').optional().isString().withMessage('会社IDは文字列である必要があります'),
  body('memberIds').optional().isArray().withMessage('メンバーIDは配列である必要があります'),
  body('memberIds.*').optional().isString().withMessage('メンバーIDは文字列である必要があります'),
  body('isCreating').optional().isBoolean().withMessage('作成フラグはブール値である必要があります')
];

const validateProjectUpdate = [
  body('name').optional().trim().notEmpty().withMessage('プロジェクト名が空です'),
  body('description').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate').optional().isISO8601().withMessage('終了日は有効な日付である必要があります'),
  body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ACTIVE']).withMessage('無効なステータスです'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('無効な優先度です'),
  body('managerIds').optional().isArray().withMessage('マネージャーIDは配列である必要があります'),
  body('managerIds.*').optional().isString().withMessage('マネージャーIDは文字列である必要があります'),
  // クライアント情報フィールドを追加
  body('clientCompanyName').optional().trim(),
  body('clientContactName').optional().trim(),
  body('clientContactPhone').optional().trim(),
  body('clientContactEmail').optional().isEmail().withMessage('無効なメールアドレスです'),
  body('clientPrefecture').optional().trim(),
  body('clientCity').optional().trim(),
  body('clientStreetAddress').optional().trim(),
  // その他のフィールド  body('companyId').optional().isString().withMessage('会社IDは文字列である必要があります'),
  body('memberIds').optional().isArray().withMessage('メンバーIDは配列である必要があります'),
  body('memberIds.*').optional().isString().withMessage('メンバーIDは文字列である必要があります'),
  body('isCreating').optional().isBoolean().withMessage('作成フラグはブール値である必要があります')
];

// Get all projects with pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { status, priority, search } = req.query;

    const where = {};
    
    // Role-based filtering
    if (req.user.role === 'COMPANY') {
      where.companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      // マネージャーは自分が参加しているプロジェクトのみ表示
      where.members = {
        some: {
          userId: req.user.id,
          isManager: true
        }
      };
    } else if (req.user.role === 'MEMBER') {
      // メンバーは自分が参加しているプロジェクトのみ表示
      where.members = {
        some: {
          userId: req.user.id
        }
      };
    }
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: offset,
        take: limit,        include: {
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
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.project.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: total
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
    const projectId = req.params.id;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Create new project
router.post('/', authenticate, authorize('ADMIN', 'COMPANY'), validateProjectCreate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('入力データが無効です', 400, errors.array());
    }

    const { name, description, startDate, endDate, status = 'PLANNED', priority = 'MEDIUM', managerIds = [], companyId } = req.body;

    // Determine companyId based on user role
    let finalCompanyId;
    if (req.user.role === 'ADMIN') {
      finalCompanyId = companyId; // ADMINは任意の会社のプロジェクトを作成可能
    } else if (req.user.role === 'COMPANY') {
      finalCompanyId = req.user.managedCompanyId; // COMPANYは自分が管理する会社のプロジェクトのみ作成可能
    }

    if (!finalCompanyId) {
      throw new AppError('会社IDが指定されていません', 400);
    }

    // Validate that managers exist
    if (managerIds.length > 0) {
      const managers = await prisma.user.findMany({
        where: { id: { in: managerIds } }
      });
      
      if (managers.length !== managerIds.length) {
        throw new AppError('一部のマネージャーが見つかりません', 400);
      }
    }

    // Status mapping from frontend to database
    const statusMapping = {
      'PLANNED': 'ACTIVE',
      'IN_PROGRESS': 'ACTIVE',
      'COMPLETED': 'COMPLETED',
      'ON_HOLD': 'ON_HOLD',
      'ACTIVE': 'ACTIVE',
      'CANCELLED': 'CANCELLED'
    };
    const mappedStatus = statusMapping[status] || status;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: mappedStatus,
        priority,
        companyId: finalCompanyId,
        members: {
          create: managerIds.map(id => ({
            userId: id,
            isManager: true
          }))
        }
      },
      include: {
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
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'プロジェクトが正常に作成されました',
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', authenticate, authorize('ADMIN', 'COMPANY'), validateProjectUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('入力データが無効です', 400, errors.array());    }    const projectId = req.params.id;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }
    
    const { name, description, startDate, endDate, status, priority, managerIds } = req.body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!existingProject) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // Permission check for COMPANY role
    if (req.user.role === 'COMPANY' && existingProject.companyId !== req.user.managedCompanyId) {
      throw new AppError('このプロジェクトを更新する権限がありません', 403);
    }

    // Validate that managers exist if provided
    if (managerIds && managerIds.length > 0) {
      const managers = await prisma.user.findMany({
        where: { id: { in: managerIds.map(id => id) } }
      });
      
      if (managers.length !== managerIds.length) {
        throw new AppError('一部のマネージャーが見つかりません', 400);
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status) {
      // Status mapping from frontend to database
      const statusMapping = {
        'PLANNED': 'ACTIVE',
        'IN_PROGRESS': 'ACTIVE',
        'COMPLETED': 'COMPLETED',
        'ON_HOLD': 'ON_HOLD',
        'ACTIVE': 'ACTIVE',
        'CANCELLED': 'CANCELLED'
      };
      updateData.status = statusMapping[status] || status;
    }
    if (priority) updateData.priority = priority;

    // Handle manager updates
    if (managerIds !== undefined) {
      updateData.members = {
        deleteMany: {},
        create: managerIds.map(id => ({
          userId: id,
          isManager: true
        }))
      };
    }

    const project = await prisma.project.update({
      where: { id: projectId },      data: updateData,
      include: {
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
        }
      }
    });

    res.json({
      success: true,
      message: 'プロジェクトが正常に更新されました',
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Update project (PATCH)
router.patch('/:id', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProjectUpdate, async (req, res, next) => {
  try {
      const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ プロジェクト更新バリデーションエラー:', {
        url: req.url,
        method: req.method,
        body: req.body,
        errors: errors.array()
      });
      throw new AppError('入力データが無効です', 400, errors.array());
    }const projectId = req.params.id;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }
      const { 
      name, 
      description, 
      startDate,
      endDate, 
      status, 
      priority, 
      managerIds,
      memberIds, // memberIdsを追加
      clientCompanyName,
      clientContactName,
      clientContactPhone,
      clientContactEmail,
      clientPrefecture,
      clientCity,
      clientStreetAddress
    } = req.body;// Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { company: true }
    });

    if (!existingProject) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // Permission check for COMPANY role
    if (req.user.role === 'COMPANY' && existingProject.companyId !== req.user.managedCompanyId) {
      throw new AppError('このプロジェクトを更新する権限がありません', 403);
    }

    // Validate that managers exist if provided
    if (managerIds && managerIds.length > 0) {
      const managers = await prisma.user.findMany({
        where: { id: { in: managerIds.map(id => id) } }
      });
      
      if (managers.length !== managerIds.length) {
        throw new AppError('一部のマネージャーが見つかりません', 400);
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status) {
      // Status mapping from frontend to database
      const statusMapping = {
        'PLANNED': 'ACTIVE',
        'IN_PROGRESS': 'ACTIVE',
        'COMPLETED': 'COMPLETED',
        'ON_HOLD': 'ON_HOLD',
        'ACTIVE': 'ACTIVE',
        'CANCELLED': 'CANCELLED'
      };
      updateData.status = statusMapping[status] || status;
    }
    if (priority) updateData.priority = priority;
    
    // クライアント情報フィールドを追加
    if (clientCompanyName !== undefined) updateData.clientCompanyName = clientCompanyName;
    if (clientContactName !== undefined) updateData.clientContactName = clientContactName;
    if (clientContactPhone !== undefined) updateData.clientContactPhone = clientContactPhone;
    if (clientContactEmail !== undefined) updateData.clientContactEmail = clientContactEmail;
    if (clientPrefecture !== undefined) updateData.clientPrefecture = clientPrefecture;
    if (clientCity !== undefined) updateData.clientCity = clientCity;    if (clientStreetAddress !== undefined) updateData.clientStreetAddress = clientStreetAddress;

    // Handle manager and member updates
    if (managerIds !== undefined || memberIds !== undefined) {
      // 既存メンバーを全削除
      updateData.members = {
        deleteMany: {}
      };
      
      // まずマネージャーを追加
      const membersToCreate = [];
      if (managerIds && managerIds.length > 0) {
        managerIds.forEach(id => {
          membersToCreate.push({
            userId: id,
            isManager: true
          });
        });
      }
      
      // 次にメンバーを追加（マネージャーと重複しないようにチェック）
      if (memberIds && memberIds.length > 0) {
        memberIds.forEach(id => {
          const userId = id;
          // マネージャーとして既に追加されていないかチェック
          if (!managerIds || !managerIds.includes(id)) {
            membersToCreate.push({
              userId: userId,
              isManager: false
            });
          }
        });
      }
      
      updateData.members.create = membersToCreate;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
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
        }
      }
    });    res.json({
      success: true,
      message: 'プロジェクトが正常に更新されました',
      data: { project }
    });  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!existingProject) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({
      success: true,
      message: 'プロジェクトが正常に削除されました'
    });
  } catch (error) {
    next(error);
  }
});

// Add members to project
router.post('/:id/members', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }
    
    const { userIds, isManager = false } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      throw new AppError('ユーザーIDは配列である必要があります', 400);
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }    // Validate that users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    if (users.length !== userIds.length) {
      throw new AppError('一部のユーザーが見つかりません', 400);
    }

    // Add members to project
    const memberData = userIds.map(userId => ({
      projectId,
      userId: userId,
      isManager: Boolean(isManager)
    }));

    await prisma.projectMembership.createMany({
      data: memberData,
      skipDuplicates: true
    });

    const updatedProject = await prisma.project.findUnique({
      where: { id: projectId },      include: {
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
        }
      }
    });

    res.json({
      success: true,
      message: 'メンバーが正常に追加されました',
      data: updatedProject
    });
  } catch (error) {
    next(error);
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;
    
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('有効なプロジェクトIDが必要です', 400);
    }
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new AppError('有効なユーザーIDが必要です', 400);
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('メンバーシップが見つかりません', 404);
    }

    await prisma.projectMembership.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    res.json({
      success: true,
      message: 'メンバーが正常に削除されました'
    });
  } catch (error) {
    next(error);
  }
});

// Update project member allocation
router.patch('/:id/members/:memberId/allocation', authenticate, authorize('COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.memberId;
    const { allocation } = req.body;

    // Validate allocation
    if (allocation === undefined || allocation < 0 || allocation > 1) {
      throw new AppError('工数は0から1の間で入力してください', 400);
    }

    // Check if membership exists
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('メンバーシップが見つかりません', 404);
    }

    // Update allocation
    const updatedMembership = await prisma.projectMembership.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: {
        allocation: parseFloat(allocation)
      }
    });

    res.json({
      success: true,
      message: '工数が正常に更新されました',
      data: updatedMembership
    });
  } catch (error) {
    next(error);
  }
});

// Update project member period
router.patch('/:id/members/:memberId', authenticate, authorize('COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.memberId;
    const { startDate, endDate } = req.body;

    // Check if membership exists
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('メンバーシップが見つかりません', 404);
    }

    // Prepare update data
    const updateData = {};
    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    // Update membership
    const updatedMembership = await prisma.projectMembership.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: updateData
    });

    res.json({
      success: true,
      message: 'メンバー期間が正常に更新されました',
      data: updatedMembership
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
