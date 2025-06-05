const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { calculateTotalAllocation, isAllocationExceeded, calculateRecommendedAllocation } = require('../utils/workload');

const router = express.Router();

// Project validation middleware for creation
const validateProjectCreate = [
  body('name').trim().notEmpty().withMessage('プロジェクト名は必須です'),
  body('description').optional().trim(),
  body('clientCompanyName').optional().trim(),
  body('clientContactName').optional().trim(),
  body('clientContactPhone').optional().trim(),
  body('clientContactEmail')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      return true;
    }),
  body('clientPrefecture').optional().trim(),
  body('clientCity').optional().trim(),
  body('clientStreetAddress').optional().trim(),
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 空の場合は有効
      }
      // 値がある場合はISO8601形式かチェック
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!iso8601Regex.test(value)) {
        throw new Error('終了日は有効な日付である必要があります');
      }
      return true;
    }),
  body('status')
    .isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .withMessage('無効なステータスです'),
  body('managerIds')
    .isArray()
    .notEmpty()
    .withMessage('プロジェクトマネージャーは必須です')
    .custom(async (value, { req }) => {
      try {
        console.log('=== Manager Validation Debug (Create) ===');
        console.log('Manager IDs to validate:', value);
        console.log('User role:', req.user.role);
        console.log('User managedCompanyId:', req.user.managedCompanyId);
        
        // valueがundefinedまたは空配列の場合はエラー（作成時は必須）
        if (!value || !Array.isArray(value) || value.length === 0) {
          console.log('No manager IDs provided for project creation');
          throw new Error('プロジェクトマネージャーは必須です');
        }
        
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

// Project validation middleware for updates
const validateProjectUpdate = [
  body('name').trim().notEmpty().withMessage('プロジェクト名は必須です'),
  body('description').optional().trim(),
  body('clientCompanyName').optional().trim(),
  body('clientContactName').optional().trim(),
  body('clientContactPhone').optional().trim(),
  body('clientContactEmail')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      return true;
    }),
  body('clientPrefecture').optional().trim(),
  body('clientCity').optional().trim(),
  body('clientStreetAddress').optional().trim(),
  body('startDate').isISO8601().withMessage('開始日は有効な日付である必要があります'),
  body('endDate')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // 空の場合は有効
      }
      // 値がある場合はISO8601形式かチェック
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!iso8601Regex.test(value)) {
        throw new Error('終了日は有効な日付である必要があります');
      }
      return true;
    }),
  body('status')
    .isIn(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .withMessage('無効なステータスです'),
  body('managerIds')
    .optional()
    .isArray()
    .withMessage('プロジェクトマネージャーは配列である必要があります')
    .custom(async (value, { req }) => {
      try {
        console.log('=== Manager Validation Debug (Update) ===');
        console.log('Manager IDs to validate:', value);
        console.log('User role:', req.user.role);
        console.log('User managedCompanyId:', req.user.managedCompanyId);
        
        // valueがundefinedまたは空配列の場合は検証をスキップ（更新時は既存のメンバー構成を保持）
        if (!value || !Array.isArray(value) || value.length === 0) {
          console.log('No manager IDs provided, keeping existing managers');
          return true;
        }
        
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
      // ADMINは統計目的のみ - プロジェクトの詳細情報にはアクセスできない
      return res.status(403).json({ 
        error: 'システム管理者はプロジェクトの詳細情報にアクセスできません' 
      });
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
            console.log(`📊 Total allocation calculated for user ${member.user.id} (${member.user.firstName} ${member.user.lastName}):`, {
              totalAllocation,
              currentProjectAllocation: member.allocation,
              userId: member.user.id
            });
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
router.post('/', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProjectCreate, async (req, res, next) => {
  try {
    console.log('=== Project Creation Debug ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', JSON.stringify(req.user, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      throw new AppError('入力データが無効です', 400, errors.array());
    }

    const { 
      name, 
      description, 
      clientCompanyName, 
      clientContactName, 
      clientContactPhone, 
      clientContactEmail, 
      clientPrefecture, 
      clientCity, 
      clientStreetAddress, 
      startDate, 
      endDate, 
      status, 
      managerIds, 
      memberIds, 
      managerAllocations 
    } = req.body;

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
        allocation: 1.0  // マネージャーのデフォルト工数は100%
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
        clientCompanyName,
        clientContactName,
        clientContactPhone,
        clientContactEmail,
        clientPrefecture,
        clientCity,
        clientStreetAddress,
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
router.patch('/:projectId', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), validateProjectUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;
    const { 
      name, 
      description, 
      clientCompanyName, 
      clientContactName, 
      clientContactPhone, 
      clientContactEmail, 
      clientPrefecture, 
      clientCity, 
      clientStreetAddress, 
      startDate, 
      endDate, 
      status, 
      managerIds, 
      memberIds, 
      managerAllocations,
      memberAllocations
    } = req.body;

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
      clientCompanyName,
      clientContactName,
      clientContactPhone,
      clientContactEmail,
      clientPrefecture,
      clientCity,
      clientStreetAddress,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status
    };

    // メンバーシップの更新処理
    // プロジェクトステータスが完了、中止、一時停止の場合はすべてのメンバーを削除
    if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'ON_HOLD') {
      console.log(`Project status changed to ${status}, removing all members...`);
      await prisma.projectMembership.deleteMany({
        where: { projectId }
      });
    }
    // メンバー情報の更新処理
    if ((memberIds !== undefined || managerIds !== undefined)) {
      if (req.body.isCreating === true) {
        // 新規プロジェクト作成時: 既存メンバーシップを削除して新しく作成
        await prisma.projectMembership.deleteMany({
          where: { projectId }
        });

        const memberships = [];

        // Add managers with default allocation
        if (managerIds?.length > 0) {
          memberships.push(...managerIds.map(id => ({
            userId: id,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            isManager: true,
            allocation: 1.0
          })));
        }

        // Add members with default allocation
        if (memberIds?.length > 0) {
          memberships.push(...memberIds
            .filter(id => !managerIds?.includes(id))
            .map(id => ({
              userId: id,
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              isManager: false,
              allocation: 1.0
            })));
        }

        // Create new memberships
        if (memberships.length > 0) {
          updateData.members = {
            create: memberships
          };
        }
      } else {
        // 既存プロジェクト編集時: 新しいメンバーのみ追加（既存メンバーは保持）
        const existingMemberships = await prisma.projectMembership.findMany({
          where: { projectId },
          select: { userId: true, isManager: true }
        });

        const existingUserIds = existingMemberships.map(m => m.userId);
        const newMemberships = [];

        // 新しいマネージャーを追加
        if (managerIds?.length > 0) {
          const newManagers = managerIds.filter(id => !existingUserIds.includes(id));
          newMemberships.push(...newManagers.map(id => ({
            userId: id,
            projectId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            isManager: true,
            allocation: 1.0
          })));
        }

        // 新しいメンバーを追加
        if (memberIds?.length > 0) {
          const newMembers = memberIds.filter(id => 
            !existingUserIds.includes(id) && !managerIds?.includes(id)
          );
          newMemberships.push(...newMembers.map(id => ({
            userId: id,
            projectId,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            isManager: false,
            allocation: 1.0
          })));
        }

        // 新しいメンバーシップを作成
        if (newMemberships.length > 0) {
          await prisma.projectMembership.createMany({
            data: newMemberships
          });
        }
      }
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

    // Transform project data for response
    const membersWithTotalAllocation = await Promise.all(
      updatedProject.members.map(async (member) => {
        const totalAllocation = await calculateTotalAllocation(member.user.id);
        return {
          ...member,
          user: {
            ...member.user,
            totalAllocation
          }
        };
      })
    );

    const transformedProject = {
      ...updatedProject,
      managers: membersWithTotalAllocation
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
        })),
      members: membersWithTotalAllocation
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
        }))
    };

    res.json({
      status: 'success',
      data: { project: transformedProject },
      message: 'プロジェクトが正常に更新されました'
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

    // プロジェクト削除時にメンバーシップも削除（Cascadeで自動削除されるが明示的に実行）
    await prisma.$transaction(async (tx) => {
      // 先にプロジェクトメンバーシップを削除
      await tx.projectMembership.deleteMany({
        where: { projectId }
      });
      
      // プロジェクト本体を削除
      await tx.project.delete({
        where: { id: projectId }
      });
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
    const { userId, isManager: requestedIsManager } = req.body;

    console.log('Adding member to project:', {
      projectId,
      userId,
      requestedIsManager,
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

    // マネージャーかどうかを判定（リクエストに基づく、またはユーザーの役割に基づく）
    const isManager = requestedIsManager !== undefined 
      ? requestedIsManager 
      : (user.role === 'MANAGER' || user.role === 'COMPANY');

    // デフォルト工数を100%に設定
    const allocation = 1.0;

    console.log('Final allocation determined:', allocation);

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

// Get manager's stats (MANAGER役割用のダッシュボード統計)
router.get('/manager-stats', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 担当プロジェクト数（マネージャーとして担当しているプロジェクト）
    const managedProjects = await prisma.projectMembership.count({
      where: { 
        userId: userId,
        isManager: true
      }
    });

    // チームメンバー数（自分が管理しているプロジェクトのメンバー数）
    const managedProjectIds = await prisma.projectMembership.findMany({
      where: { 
        userId: userId,
        isManager: true
      },
      select: { projectId: true }
    });

    const projectIds = managedProjectIds.map(p => p.projectId);
    
    const teamMembers = await prisma.projectMembership.count({
      where: {
        projectId: { in: projectIds },
        userId: { not: userId } // 自分以外
      }
    });

    // 完了タスク数（仮のカウント - タスクシステムが実装されたら適切に実装）
    const completedTasks = await prisma.project.count({
      where: {
        id: { in: projectIds },
        status: 'COMPLETED'
      }
    });

    // 保留中タスク数（仮のカウント）
    const pendingTasks = await prisma.project.count({
      where: {
        id: { in: projectIds },
        status: 'ON_HOLD'
      }
    });

    res.json({
      status: 'success',
      data: {
        managedProjects,
        teamMembers,
        completedTasks,
        pendingTasks
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;