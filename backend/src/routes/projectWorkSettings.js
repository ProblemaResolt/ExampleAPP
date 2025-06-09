const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const prisma = require('../lib/prisma');

const router = express.Router();

// プロジェクト勤務設定取得
router.get('/project/:projectId/work-settings',
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId } = req.params;

      console.log('=== Project Work Settings Retrieval Debug ===');
      console.log('Project ID:', projectId);
      console.log('User:', {
        id: req.user.id,
        role: req.user.role,
        managedCompanyId: req.user.managedCompanyId
      });

      // プロジェクトの存在確認と権限チェック
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          company: true,
          members: {
            where: { userId: req.user.id }
          }
        }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // 権限チェック（プロジェクトメンバーまたは管理権限があるユーザー）
      const hasAccess = req.user.role === 'ADMIN' ||
        (req.user.role === 'COMPANY' && project.company.id === req.user.managedCompanyId) ||
        project.members.length > 0;

      if (!hasAccess) {
        throw new AppError('このプロジェクトの勤務設定を取得する権限がありません', 403);
      }

      // プロジェクト勤務設定を取得
      const workSettings = await prisma.projectWorkSettings.findMany({
        where: { projectId },
        include: {
          userAssignments: {
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
          holidaySettings: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📋 Found ${workSettings.length} work settings for project ${projectId}`);
      
      res.json({
        status: 'success',
        data: {
          project: {
            id: project.id,
            name: project.name
          },
          workSettings
        }
      });
    } catch (error) {
      console.error('Error retrieving project work settings:', error);
      next(error);
    }
  }
);

// プロジェクト勤務設定作成
router.post('/project/:projectId/work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('standardHours').isFloat({ min: 1, max: 12 }).withMessage('標準勤務時間は1-12時間で入力してください'),
    body('workStartTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('開始時間の形式が正しくありません（HH:MM）'),
    body('workEndTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('終了時間の形式が正しくありません（HH:MM）'),
    body('breakDuration').isInt({ min: 0, max: 480 }).withMessage('休憩時間は0-480分で入力してください'),
    body('overtimeThreshold').isFloat({ min: 0, max: 24 }).withMessage('残業閾値は0-24時間で入力してください'),
    body('workLocation').optional().isString(),
    body('address').optional().isString(),
    body('transportationCostDefault').optional().isInt({ min: 0 }),
    body('isFlexTime').optional().isBoolean(),
    body('flexTimeStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('flexTimeEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('coreTimeStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('coreTimeEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('weekStartDay').optional().isInt({ min: 0, max: 6 }).withMessage('開始曜日は0-6の数値で入力してください（0=日曜日、1=月曜日、...、6=土曜日）')
  ],
  async (req, res, next) => {
    try {
      console.log('=== Project Work Settings Creation Debug ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Project ID:', req.params.projectId);
      console.log('User:', JSON.stringify(req.user, null, 2));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { projectId } = req.params;
      const {
        standardHours,
        workStartTime,
        workEndTime,
        breakDuration,
        overtimeThreshold,
        workLocation,
        address,
        transportationCostDefault,
        isFlexTime,
        flexTimeStart,
        flexTimeEnd,
        coreTimeStart,
        coreTimeEnd,
        weekStartDay
      } = req.body;

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
        throw new AppError('このプロジェクトに設定を作成する権限がありません', 403);
      } else if (req.user.role === 'MANAGER' && project.members.length === 0) {
        throw new AppError('このプロジェクトに設定を作成する権限がありません', 403);
      }

      // 設定名を自動生成
      const settingName = `${project.name} (${workStartTime}-${workEndTime})`;

      // プロジェクトワーク設定を作成
      const workSettings = await prisma.projectWorkSettings.create({
        data: {
          projectId,
          name: settingName,
          standardHours,
          workStartTime,
          workEndTime,
          breakDuration,
          overtimeThreshold,
          workLocation,
          address,
          transportationCostDefault: transportationCostDefault || 0,
          isFlexTime: isFlexTime || false,
          flexTimeStart,
          flexTimeEnd,
          coreTimeStart,
          coreTimeEnd,
          weekStartDay: weekStartDay !== undefined ? weekStartDay : 1
        }
      });

      console.log('✅ Project work settings created:', workSettings.id);

      // 🔥 重要: プロジェクトメンバー全員に勤務設定を自動割り当て
      const projectMembers = await prisma.projectMembership.findMany({
        where: { projectId },
        select: { userId: true }
      });

      console.log(`📋 Found ${projectMembers.length} project members to assign work settings`);

      if (projectMembers.length > 0) {
        const userAssignments = projectMembers.map(member => ({
          userId: member.userId,
          projectWorkSettingsId: workSettings.id,
          startDate: new Date(),
          endDate: null, // 無期限
          isActive: true
        }));

        await prisma.userProjectWorkSettings.createMany({
          data: userAssignments
        });

        console.log(`✅ Created ${userAssignments.length} user assignments for work settings ${workSettings.id}`);
      }

      // 更新された設定を再取得（userAssignmentsを含む）
      const updatedWorkSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: workSettings.id },
        include: {
          userAssignments: {
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
        status: 'success',
        data: {
          workSettings: updatedWorkSettings,
          message: 'プロジェクト勤務設定を作成し、メンバーに割り当てました'
        }
      });
    } catch (error) {
      console.error('Error creating project work settings:', error);
      next(error);
    }
  }
);

// 既存データの修復エンドポイント - プロジェクト勤務設定をメンバーに自動割り当て
router.post('/project/:projectId/work-settings/:settingsId/assign-members',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { projectId, settingsId } = req.params;

      console.log(`🔧 Repairing work settings assignments for project ${projectId}, settings ${settingsId}`);

      // プロジェクトの権限確認
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
        throw new AppError('このプロジェクトに設定を変更する権限がありません', 403);
      } else if (req.user.role === 'MANAGER' && project.members.length === 0) {
        throw new AppError('このプロジェクトに設定を変更する権限がありません', 403);
      }

      // プロジェクト勤務設定の存在確認
      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: settingsId },
        include: {
          userAssignments: true
        }
      });

      if (!workSettings || workSettings.projectId !== projectId) {
        throw new AppError('プロジェクト勤務設定が見つかりません', 404);
      }

      // プロジェクトメンバーを取得
      const projectMembers = await prisma.projectMembership.findMany({
        where: { projectId },
        select: { userId: true }
      });

      // 既に割り当てられているユーザーIDを取得
      const assignedUserIds = workSettings.userAssignments
        .filter(assignment => assignment.isActive)
        .map(assignment => assignment.userId);

      // 未割り当てのメンバーを特定
      const unassignedMembers = projectMembers.filter(
        member => !assignedUserIds.includes(member.userId)
      );

      console.log(`📋 Found ${unassignedMembers.length} unassigned members out of ${projectMembers.length} total`);

      let assignmentCount = 0;
      if (unassignedMembers.length > 0) {
        const userAssignments = unassignedMembers.map(member => ({
          userId: member.userId,
          projectWorkSettingsId: settingsId,
          startDate: new Date(),
          endDate: null,
          isActive: true
        }));

        await prisma.userProjectWorkSettings.createMany({
          data: userAssignments
        });

        assignmentCount = userAssignments.length;
        console.log(`✅ Created ${assignmentCount} new user assignments`);
      }

      res.json({
        status: 'success',
        data: {
          totalMembers: projectMembers.length,
          previouslyAssigned: assignedUserIds.length,
          newAssignments: assignmentCount,
          message: `${assignmentCount}名のメンバーに勤務設定を割り当てました`
        }
      });
    } catch (error) {
      console.error('Error assigning work settings to members:', error);
      next(error);
    }
  }
);

// 勤務設定更新
router.put('/work-settings/:settingsId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('standardHours').optional().isFloat({ min: 1, max: 12 }),
    body('workStartTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('workEndTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('breakDuration').optional().isInt({ min: 0, max: 480 }),
    body('overtimeThreshold').optional().isFloat({ min: 0, max: 24 }),
    body('workLocation').optional().isString(),
    body('weekStartDay').optional().isInt({ min: 0, max: 6 })
  ],
  async (req, res, next) => {
    try {
      const { settingsId } = req.params;
      const updateData = req.body;

      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: settingsId },
        include: {
          project: {
            include: { company: true }
          }
        }
      });

      if (!workSettings) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この勤務設定を更新する権限がありません', 403);
      }

      const updatedWorkSettings = await prisma.projectWorkSettings.update({
        where: { id: settingsId },
        data: updateData,
        include: {
          userAssignments: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      res.json({
        status: 'success',
        data: { workSettings: updatedWorkSettings },
        message: '勤務設定を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務設定削除
router.delete('/work-settings/:settingsId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { settingsId } = req.params;

      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: settingsId },
        include: {
          project: {
            include: { company: true }
          }
        }
      });

      if (!workSettings) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この勤務設定を削除する権限がありません', 403);
      }

      await prisma.projectWorkSettings.delete({
        where: { id: settingsId }
      });

      res.json({
        status: 'success',
        message: '勤務設定を削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー割り当て
router.post('/work-settings/:settingsId/assign-users',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('userIds').isArray().withMessage('ユーザーIDの配列を指定してください')
  ],
  async (req, res, next) => {
    try {
      const { settingsId } = req.params;
      const { userIds } = req.body;

      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: settingsId },
        include: {
          project: {
            include: { company: true }
          }
        }
      });

      if (!workSettings) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この勤務設定にユーザーを割り当てる権限がありません', 403);
      }

      const userAssignments = userIds.map(userId => ({
        userId,
        projectWorkSettingsId: settingsId,
        startDate: new Date(),
        endDate: null,
        isActive: true
      }));

      await prisma.userProjectWorkSettings.createMany({
        data: userAssignments,
        skipDuplicates: true
      });

      res.json({
        status: 'success',
        message: 'ユーザーを割り当てました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー割り当て解除
router.delete('/user-assignments/:assignmentId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { assignmentId } = req.params;

      const assignment = await prisma.userProjectWorkSettings.findUnique({
        where: { id: assignmentId },
        include: {
          projectWorkSettings: {
            include: {
              project: {
                include: { company: true }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new AppError('割り当てが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && assignment.projectWorkSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この割り当てを解除する権限がありません', 403);
      }

      await prisma.userProjectWorkSettings.delete({
        where: { id: assignmentId }
      });

      res.json({
        status: 'success',
        message: 'ユーザーの割り当てを解除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休日設定追加
router.post('/work-settings/:settingsId/holidays',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('holidays').isArray().withMessage('休日の配列を指定してください'),
    body('holidays.*.date').isISO8601().withMessage('有効な日付を指定してください'),
    body('holidays.*.name').notEmpty().withMessage('休日名は必須です')
  ],
  async (req, res, next) => {
    try {
      const { settingsId } = req.params;
      const { holidays } = req.body;

      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: settingsId },
        include: {
          project: {
            include: { company: true }
          }
        }
      });

      if (!workSettings) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この勤務設定に休日を追加する権限がありません', 403);
      }

      const holidayData = holidays.map(holiday => ({
        projectWorkSettingsId: settingsId,
        date: new Date(holiday.date),
        name: holiday.name,
        isRecurring: holiday.isRecurring || false
      }));

      await prisma.projectWorkSettingsHoliday.createMany({
        data: holidayData
      });

      res.json({
        status: 'success',
        message: '休日を追加しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休日設定削除
router.delete('/holiday-settings/:holidayId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { holidayId } = req.params;

      const holiday = await prisma.projectWorkSettingsHoliday.findUnique({
        where: { id: holidayId },
        include: {
          projectWorkSettings: {
            include: {
              project: {
                include: { company: true }
              }
            }
          }
        }
      });

      if (!holiday) {
        throw new AppError('休日設定が見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && holiday.projectWorkSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('この休日設定を削除する権限がありません', 403);
      }

      await prisma.projectWorkSettingsHoliday.delete({
        where: { id: holidayId }
      });      res.json({
        status: 'success',
        message: '休日設定を削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 個人勤務設定取得
router.get('/personal/:projectId/my-settings',
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      console.log('=== Personal Work Settings Retrieval Debug ===');
      console.log('Project ID:', projectId);
      console.log('User ID:', userId);

      // プロジェクトの存在確認とアクセス権限チェック
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          company: true,
          members: {
            where: { userId: userId }
          }
        }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }      // アクセス権限チェック（プロジェクトメンバーまたは管理権限があるユーザー）
      const hasAccess = req.user.role === 'ADMIN' ||
        (req.user.role === 'COMPANY' && project.company.id === req.user.managedCompanyId) ||
        project.members.length > 0;

      if (!hasAccess) {
        throw new AppError('このプロジェクトの個人勤務設定にアクセスする権限がありません', 403);
      }// ユーザーの個人勤務設定を取得
      const personalSettings = await prisma.userProjectWorkSettings.findFirst({
        where: {
          user: { id: userId },
          projectWorkSettings: { projectId: projectId },
          isActive: true
        },
        include: {
          projectWorkSettings: true
        }
      });      if (!personalSettings) {
        return res.json({
          status: 'success',
          data: {
            hasSettings: false,
            settings: null
          },
          message: '個人勤務設定が設定されていません'
        });
      }

      res.json({
        status: 'success',
        data: {
          hasSettings: true,
          settings: {
            id: personalSettings.projectWorkSettings.id,
            name: personalSettings.projectWorkSettings.name,
            workStartTime: personalSettings.projectWorkSettings.workStartTime,
            workEndTime: personalSettings.projectWorkSettings.workEndTime,
            breakDuration: personalSettings.projectWorkSettings.breakDuration,
            workLocation: personalSettings.projectWorkSettings.workLocation,
            overtimeThreshold: personalSettings.projectWorkSettings.overtimeThreshold,
            weekStartDay: personalSettings.projectWorkSettings.weekStartDay,
            assignmentId: personalSettings.id,
            startDate: personalSettings.startDate,
            endDate: personalSettings.endDate,
            createdAt: personalSettings.projectWorkSettings.createdAt,
            updatedAt: personalSettings.projectWorkSettings.updatedAt
          }
        },
        message: '個人勤務設定を取得しました'
      });
    } catch (error) {
      console.error('Error retrieving personal work settings:', error);
      next(error);
    }
  }
);

// 個人勤務設定作成・更新
router.post('/personal/:projectId/my-settings',
  authenticate,
  [
    body('name')
      .notEmpty()
      .withMessage('設定名は必須です')
      .isLength({ max: 100 })
      .withMessage('設定名は100文字以内で入力してください'),
    body('workStartTime')
      .notEmpty()
      .withMessage('勤務開始時間は必須です')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('勤務開始時間は HH:MM 形式で入力してください'),
    body('workEndTime')
      .notEmpty()
      .withMessage('勤務終了時間は必須です')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('勤務終了時間は HH:MM 形式で入力してください'),
    body('breakDuration')
      .isInt({ min: 0, max: 480 })
      .withMessage('休憩時間は0から480分の間で入力してください'),
    body('workLocation')
      .optional()
      .isLength({ max: 100 })
      .withMessage('勤務場所は100文字以内で入力してください'),
    body('overtimeThreshold')
      .optional()
      .isInt({ min: 0, max: 1440 })
      .withMessage('残業閾値は0から1440分の間で入力してください'),    body('weekStartDay')
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('週開始日は0から6の範囲で入力してください（0=日曜日、1=月曜日...6=土曜日）'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('開始日は有効な日付形式で入力してください'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('終了日は有効な日付形式で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('入力データが無効です', 400, errors.array());
      }

      const { projectId } = req.params;
      const userId = req.user.id;      const {
        name,
        workStartTime,
        workEndTime,
        breakDuration = 60,
        workLocation,
        overtimeThreshold = 480,
        weekStartDay = 1, // デフォルトは月曜日（1）
        startDate,
        endDate
      } = req.body;console.log('=== Personal Work Settings Create/Update Debug ===');
      console.log('Project ID:', projectId);
      console.log('User ID:', userId);
      console.log('Request body:', req.body);

      // プロジェクトの存在確認とアクセス権限チェック
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          company: true,
          members: {
            where: { userId: userId }
          }
        }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // アクセス権限チェック（プロジェクトメンバーまたは管理権限があるユーザー）
      const hasAccess = req.user.role === 'ADMIN' ||
        (req.user.role === 'COMPANY' && project.company.id === req.user.managedCompanyId) ||
        project.members.length > 0;

      if (!hasAccess) {
        throw new AppError('このプロジェクトの個人勤務設定を変更する権限がありません', 403);
      }

      // 勤務時間の検証
      const startTime = new Date(`1970-01-01T${workStartTime}:00`);
      const endTime = new Date(`1970-01-01T${workEndTime}:00`);
      
      if (startTime >= endTime) {
        throw new AppError('勤務終了時間は勤務開始時間より後である必要があります', 400);
      }

      // 勤務時間の計算
      const workMinutes = (endTime - startTime) / (1000 * 60) - breakDuration;
      if (workMinutes <= 0) {
        throw new AppError('勤務時間は休憩時間より長い必要があります', 400);
      }      // 既存の個人設定があるかチェック
      const existingAssignment = await prisma.userProjectWorkSettings.findFirst({
        where: {
          userId: userId,
          projectWorkSettings: { projectId: projectId },
          isActive: true
        },
        include: {
          projectWorkSettings: true
        }
      });

      let workSettings;
      let assignment;

      if (existingAssignment) {
        // 既存の設定を更新
        workSettings = await prisma.projectWorkSettings.update({
          where: { id: existingAssignment.projectWorkSettingsId },
          data: {
            name,
            workStartTime,
            workEndTime,
            breakDuration,
            workLocation,
            overtimeThreshold,
            weekStartDay
          }
        });

        // アサインメントの日付を更新（必要に応じて）
        if (startDate || endDate) {
          assignment = await prisma.userProjectWorkSettings.update({
            where: { id: existingAssignment.id },
            data: {
              ...(startDate && { startDate: new Date(startDate) }),
              ...(endDate && { endDate: new Date(endDate) })
            }
          });
        } else {
          assignment = existingAssignment;
        }
      } else {
        // 新しい設定を作成
        workSettings = await prisma.projectWorkSettings.create({
          data: {
            projectId: projectId,
            name,
            workStartTime,
            workEndTime,
            breakDuration,
            workLocation,
            overtimeThreshold,
            weekStartDay
          }
        });

        // アサインメントを作成
        assignment = await prisma.userProjectWorkSettings.create({
          data: {
            userId: userId,
            projectWorkSettingsId: workSettings.id,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            isActive: true
          }
        });
      }      res.json({
        status: 'success',
        data: {
          hasSettings: true,
          settings: {
            id: workSettings.id,
            name: workSettings.name,
            workStartTime: workSettings.workStartTime,
            workEndTime: workSettings.workEndTime,
            breakDuration: workSettings.breakDuration,
            workLocation: workSettings.workLocation,
            overtimeThreshold: workSettings.overtimeThreshold,
            weekStartDay: workSettings.weekStartDay,
            assignmentId: assignment.id,
            startDate: assignment.startDate,
            endDate: assignment.endDate,
            createdAt: workSettings.createdAt,
            updatedAt: workSettings.updatedAt
          }
        },        message: existingAssignment ? '個人勤務設定を更新しました' : '個人勤務設定を作成しました'
      });
    } catch (error) {
      console.error('Error creating/updating personal work settings:', error);
      next(error);
    }
  }
);

// 個人勤務設定取得
router.get('/personal/:projectId/my-settings',
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      console.log('=== Personal Work Settings Retrieval Debug ===');
      console.log('Project ID:', projectId);
      console.log('User ID:', userId);

      // プロジェクトメンバーシップ確認
      const membership = await prisma.projectMembership.findFirst({
        where: {
          projectId: projectId,
          userId: userId
        }
      });

      if (!membership) {
        throw new AppError('このプロジェクトのメンバーではありません', 403);
      }

      // 個人の勤務設定を取得
      const userAssignment = await prisma.userProjectWorkSettings.findFirst({
        where: {
          userId: userId,
          projectWorkSettings: {
            projectId: projectId
          },
          isActive: true
        },
        include: {
          projectWorkSettings: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('User assignment found:', !!userAssignment);

      if (!userAssignment) {
        // 設定がない場合
        res.json({
          status: 'success',
          data: {
            hasSettings: false,
            settings: null
          }
        });
        return;
      }

      const workSettings = userAssignment.projectWorkSettings;

      res.json({
        status: 'success',
        data: {
          hasSettings: true,
          settings: {
            id: workSettings.id,
            name: workSettings.name,
            workStartTime: workSettings.workStartTime,
            workEndTime: workSettings.workEndTime,
            breakDuration: workSettings.breakDuration,
            workLocation: workSettings.workLocation,
            overtimeThreshold: workSettings.overtimeThreshold,
            weekStartDay: workSettings.weekStartDay,
            assignmentId: userAssignment.id,
            startDate: userAssignment.startDate,
            endDate: userAssignment.endDate,
            createdAt: workSettings.createdAt,
            updatedAt: workSettings.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('Error retrieving personal work settings:', error);
      next(error);
    }
  }
);

module.exports = router;
