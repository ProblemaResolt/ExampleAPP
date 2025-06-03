const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { calculateTotalAllocation, isAllocationExceeded, calculateRecommendedAllocation } = require('../utils/workload');

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
        console.log('=== Manager Validation Debug ===');
        console.log('Manager IDs to validate:', value);
        console.log('User role:', req.user.role);
        console.log('User managedCompanyId:', req.user.managedCompanyId);
        
        const managers = await prisma.user.findMany({
          where: {
            id: { in: value },
            role: { in: ['MANAGER', 'COMPANY'] },
            isActive: true
          },
          select: {
            id: true,
            companyId: true,
            managedCompanyId: true,
            role: true
          }
        });

        console.log('Found managers:', JSON.stringify(managers, null, 2));

        if (managers.length !== value.length) {
          console.log('Manager count mismatch - Expected:', value.length, 'Found:', managers.length);
          throw new Error('指定されたマネージャーの一部が見つからないか、無効です');
        }

        if (req.user.role === 'COMPANY' && req.user.managedCompanyId) {
          const invalidManager = managers.find(m => 
            m.companyId !== req.user.managedCompanyId && 
            m.managedCompanyId !== req.user.managedCompanyId
          );
          if (invalidManager) {
            console.log('Invalid manager found:', JSON.stringify(invalidManager, null, 2));
            throw new Error('指定されたマネージャーの一部が異なる会社に所属しています');
          }
        } else if (req.user.role === 'MANAGER' && req.user.companyId) {
          // MANAGERの場合は自分の会社のマネージャーのみ選択可能
          const invalidManager = managers.find(m => 
            m.companyId !== req.user.companyId && 
            m.managedCompanyId !== req.user.companyId
          );
          if (invalidManager) {
            console.log('Invalid manager found for MANAGER role:', JSON.stringify(invalidManager, null, 2));
            throw new Error('指定されたマネージャーの一部が異なる会社に所属しています');
          }
        }

        console.log('Manager validation passed');
        return true;
      } catch (error) {
        console.error('Manager validation error:', error.message);
        throw new Error(error.message);
      }
    })
];

// Get all projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const include = req.query.include || [];
    
    console.log('=== Project Access Control Debug ===');
    console.log('User:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      companyId: req.user.companyId,
      managedCompanyId: req.user.managedCompanyId
    });
    
    // クエリ条件の構築
    let where = {};
    
    // ユーザーの役割に基づいてアクセス権限を制御
    if (req.user.role === 'ADMIN') {
      // ADMINは全てのプロジェクトにアクセス可能
      if (companyId) {
        where.companyId = companyId;
      }
      console.log('ADMIN access: All projects or filtered by companyId:', companyId);
    } else if (req.user.role === 'COMPANY') {
      // 管理者ロールは自分が管理する会社のプロジェクトのみ
      where.companyId = req.user.managedCompanyId;
      console.log('COMPANY access: managedCompanyId =', req.user.managedCompanyId);
    } else if (req.user.role === 'MANAGER') {
      // MANAGERは自分がメンバーとして参加しているプロジェクトのみ
      where = {
        members: {
          some: {
            userId: req.user.id
          }
        }
      };
      console.log('MANAGER access: projects where user is member');
    } else {
      // 一般ユーザーは自分がメンバーとして参加しているプロジェクトのみ
      where = {
        members: {
          some: {
            userId: req.user.id
          }
        }
      };
      console.log('MEMBER access: projects where user is member');
    }
    
    console.log('Final where clause:', JSON.stringify(where, null, 2));

    // プロジェクト一覧を取得
    const projects = await prisma.project.findMany({
      where,
      include: {
        company: true,
        members: {
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
            },
            project: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${projects.length} projects for user ${req.user.role}:${req.user.id}`);

    // プロジェクトの詳細をログ出力
    if (projects.length > 0) {
      console.log('Project details:', JSON.stringify(projects[0], null, 2));
    }

    // 各メンバーの総工数を計算
    const projectsWithTotalAllocation = await Promise.all(projects.map(async project => {
      try {
        const membersWithTotalAllocation = await Promise.all(project.members.map(async member => {
          try {
            const totalAllocation = await calculateTotalAllocation(member.user.id);
            return {
              ...member,
              user: {
                ...member.user,
                totalAllocation
              }
            };
          } catch (error) {
            console.error(`Error calculating total allocation for user ${member.user.id}:`, error);
            return {
              ...member,
              user: {
                ...member.user,
                totalAllocation: 0
              }
            };
          }
        }));

        // フロントエンド向けにmanagersとmembersを分離
        const managers = membersWithTotalAllocation
          .filter(m => m.isManager)
          .map(m => ({
            ...m.user,
            projectMembership: {
              startDate: m.startDate,
              endDate: m.endDate,
              isManager: true,
              allocation: m.allocation
            },
            totalAllocation: m.user.totalAllocation
          }));

        const projectMembers = membersWithTotalAllocation
          .filter(m => !m.isManager)
          .map(m => ({
            ...m.user,
            projectMembership: {
              startDate: m.startDate,
              endDate: m.endDate,
              isManager: false,
              allocation: m.allocation
            },
            totalAllocation: m.user.totalAllocation
          }));

        return {
          ...project,
          members: projectMembers,
          managers
        };
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        return {
          ...project,
          members: project.members.map(member => ({
            ...member,
            user: {
              ...member.user,
              totalAllocation: 0
            }
          }))
        };
      }
    }));

    console.log('Sending projects data:', { 
      data: { 
        projects: projectsWithTotalAllocation,
        total: projectsWithTotalAllocation.length 
      } 
    });
    
    // デバッグ: プロジェクトの詳細ログ
    console.log('Project details:', JSON.stringify(projectsWithTotalAllocation, null, 2));

    res.json({
      data: {
        projects: projectsWithTotalAllocation,
        total: projectsWithTotalAllocation.length
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    next(error);
  }
});

// Create project
router.post('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProject, async (req, res, next) => {
  try {
    console.log('=== Project Creation Debug ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', JSON.stringify(req.user, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      throw new AppError('入力データが無効です', 400, errors.array());
    }

    const { name, description, startDate, endDate, status, managerIds, memberIds, managerAllocations } = req.body;

    let companyId;
    if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      // MANAGERは自分の会社でのみプロジェクトを作成可能
      companyId = req.user.companyId;
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
        isManager: true,
        allocation: managerAllocations?.[userId] || 1.0  // マネージャーの工数設定を使用、デフォルトは100%
      }));
      memberships.push(...managerMemberships);
    }

    // Add members
    if (memberIds?.length > 0) {
      const memberMemberships = memberIds.map(userId => ({
        userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isManager: false,
        allocation: 1.0  // メンバーのデフォルト工数は100%
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
    const { name, description, startDate, endDate, status, managerIds, memberIds, managerAllocations } = req.body;

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
          isManager: true,
          allocation: managerAllocations?.[id] || 1.0  // マネージャーの工数設定を使用、デフォルトは100%
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
            isManager: false,
            allocation: 1.0  // メンバーのデフォルト工数は100%
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
});    // Update member period
router.patch('/:projectId/members/:userId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
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
    const { userId, allocation: requestedAllocation } = req.body;

    console.log('Adding member to project:', {
      projectId,
      userId,
      requestedAllocation,
      body: req.body,
      requestedBy: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email
      }
    });

    // プロジェクトの存在確認と権限チェック
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
        members: {
          where: { userId: req.user.id, isManager: true }
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
      // MANAGERの場合、そのプロジェクトのマネージャーである必要がある
      const isProjectManager = project.members.length > 0;
      if (!isProjectManager) {
        throw new AppError('このプロジェクトにメンバーを追加する権限がありません', 403);
      }
    }

    // ユーザー情報を取得（役割の確認のため）
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // マネージャーかどうかを判定
    const isManager = user.role === 'MANAGER' || user.role === 'COMPANY';

    // 工数の決定：リクエストされた工数、または推奨工数
    let allocation;
    if (requestedAllocation !== undefined && requestedAllocation !== null) {
      allocation = parseFloat(requestedAllocation);
      // 工数のバリデーション
      if (isNaN(allocation) || allocation < 0 || allocation > 1) {
        throw new AppError('工数は0から1の間の数値で指定してください', 400);
      }
    } else {
      // 推奨工数を計算
      allocation = await calculateRecommendedAllocation(userId, isManager);
    }

    console.log('Final allocation determined:', allocation);

    // 利用可能な工数がない場合はエラー
    if (allocation <= 0) {
      throw new AppError('このメンバーは既に100%の工数が割り当てられているため、新しいプロジェクトに参加できません', 400);
    }

    // 工数チェック（全てのユーザーが対象）
    if (await isAllocationExceeded(userId, allocation)) {
      throw new AppError('このメンバーの総工数が100%を超えてしまいます', 400);
    }

    // 既存のメンバーシップをチェック
    const existingMembership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (existingMembership) {
      throw new AppError('このメンバーは既にプロジェクトに参加しています', 400);
    }

    // メンバーシップを作成
    const membership = await prisma.projectMembership.create({
      data: {
        userId,
        projectId,
        startDate: new Date(),
        isManager,
        allocation
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

    res.status(201).json({
      data: membership,
      message: isManager ? 'マネージャーとしてプロジェクトに追加されました' : 'メンバーとしてプロジェクトに追加されました'
    });
  } catch (error) {
    console.error('Error adding member to project:', {
      error: error.message,
      stack: error.stack,
      projectId: req.params.projectId,
      requestBody: req.body
    });
    next(error);
  }
});

// プロジェクトメンバーの削除
router.delete('/:projectId/members/:userId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    // プロジェクトメンバーシップの存在確認
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
      throw new AppError('このメンバーを削除する権限がありません', 403);
    } else if (req.user.role === 'MANAGER') {
      const managerMembership = await prisma.projectMembership.findFirst({
        where: {
          projectId,
          userId: req.user.id,
          isManager: true
        }
      });
      if (!managerMembership) {
        throw new AppError('このメンバーを削除する権限がありません', 403);
      }
    }

    // メンバーの削除
    await prisma.projectMembership.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    res.status(200).json({ message: 'メンバーを削除しました' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メンバーの工数を更新
router.patch('/:projectId/members/:userId/allocation', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { allocation } = req.body;

    // 工数のバリデーション
    if (typeof allocation !== 'number' || allocation < 0 || allocation > 1) {
      throw new AppError('工数は0から1の間の数値で指定してください', 400);
    }

    // プロジェクトメンバーシップの存在確認
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
      throw new AppError('このメンバーの工数を更新する権限がありません', 403);
    } else if (req.user.role === 'MANAGER') {
      const managerMembership = await prisma.projectMembership.findFirst({
        where: {
          projectId,
          userId: req.user.id,
          isManager: true
        }
      });
      if (!managerMembership) {
        throw new AppError('このメンバーの工数を更新する権限がありません', 403);
      }
    }

    // 工数超過チェック
    const willExceed = await isAllocationExceeded(userId, allocation, projectId);
    if (willExceed) {
      throw new AppError('このメンバーの総工数が100%を超えてしまいます', 400);
    }

    // 工数の更新
    const updatedMembership = await prisma.projectMembership.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: {
        allocation
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

    // 更新後の総工数を計算
    const totalAllocation = await calculateTotalAllocation(userId);

    const memberData = {
      ...updatedMembership.user,
      projectMembership: {
        startDate: updatedMembership.startDate,
        endDate: updatedMembership.endDate,
        isManager: updatedMembership.isManager,
        allocation: updatedMembership.allocation
      },
      totalAllocation
    };

    res.json({
      status: 'success',
      data: {
        member: memberData,
        message: 'メンバーの工数を更新しました'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;