const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body, query } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();

// 勤怠打刻 - 出勤
router.post('/clock-in', 
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('location').optional().isString(),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { date, location, note } = req.body;
      const userId = req.user.id;
      const clockInTime = new Date();

      // 同日の勤怠記録があるかチェック
      const existingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          date: new Date(date)
        }
      });

      let timeEntry;
      if (existingEntry) {
        // 既存の記録を更新
        timeEntry = await prisma.timeEntry.update({
          where: { id: existingEntry.id },
          data: {
            clockIn: clockInTime,
            note: note || existingEntry.note,
            status: 'PENDING'
          }
        });
      } else {
        // 新規作成
        timeEntry = await prisma.timeEntry.create({
          data: {
            userId,
            date: new Date(date),
            clockIn: clockInTime,
            note,
            status: 'PENDING'
          }
        });
      }      // レスポンス用にJST時刻として表示（JST時刻として保存されているため、ローカル時刻として表示）
      const responseTimeEntry = {
        ...timeEntry,
        clockIn: timeEntry.clockIn ? timeEntry.clockIn.toTimeString().substring(0, 5) + ' JST' : null,
        clockOut: timeEntry.clockOut ? timeEntry.clockOut.toTimeString().substring(0, 5) + ' JST' : null
      };

      res.status(201).json({
        status: 'success',
        data: { timeEntry: responseTimeEntry },
        message: '出勤を記録しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠打刻 - 退勤
router.patch('/clock-out/:timeEntryId',
  authenticate,
  [
    body('note').optional().isString(),
    body('workSummary').optional().isString(),
    body('achievements').optional().isString(),
    body('challenges').optional().isString(),
    body('nextDayPlan').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { timeEntryId } = req.params;
      const { note, workSummary, achievements, challenges, nextDayPlan } = req.body;
      const userId = req.user.id;
      const clockOutTime = new Date();

      // 勤怠記録を取得
      const timeEntry = await prisma.timeEntry.findFirst({
        where: {
          id: timeEntryId,
          userId
        }
      });

      if (!timeEntry) {
        throw new AppError('勤怠記録が見つかりません', 404);
      }

      if (!timeEntry.clockIn) {
        throw new AppError('出勤記録がありません', 400);
      }

      // 労働時間を計算
      const workHours = (clockOutTime - timeEntry.clockIn) / (1000 * 60 * 60);      // 勤怠記録を更新
      const updatedTimeEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          clockOut: clockOutTime,
          workHours: workHours,
          note: note || timeEntry.note,
          workSummary,
          achievements,
          challenges,
          nextDayPlan        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true }
          }
        }      });

      // レスポンス用にJST時刻として表示（JST時刻として保存されているため、ローカル時刻として表示）
      const responseTimeEntry = {
        ...updatedTimeEntry,
        clockIn: updatedTimeEntry.clockIn ? updatedTimeEntry.clockIn.toTimeString().substring(0, 5) + ' JST' : null,
        clockOut: updatedTimeEntry.clockOut ? updatedTimeEntry.clockOut.toTimeString().substring(0, 5) + ' JST' : null
      };

      res.json({
        status: 'success',
        data: { timeEntry: responseTimeEntry },
        message: '退勤を記録しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休憩開始
router.post('/break-start/:timeEntryId',
  authenticate,
  [
    body('breakType').isIn(['LUNCH', 'SHORT', 'OTHER']).withMessage('有効な休憩タイプを選択してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { timeEntryId } = req.params;
      const { breakType } = req.body;
      const userId = req.user.id;

      // 勤怠記録の確認
      const timeEntry = await prisma.timeEntry.findFirst({
        where: {
          id: timeEntryId,
          userId
        }
      });

      if (!timeEntry) {
        throw new AppError('勤怠記録が見つかりません', 404);
      }

      // 休憩記録を作成
      const breakEntry = await prisma.breakEntry.create({
        data: {
          timeEntryId,
          startTime: new Date(),
          breakType
        }
      });

      res.status(201).json({
        status: 'success',
        data: { breakEntry },
        message: '休憩を開始しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休憩終了
router.patch('/break-end/:breakId',
  authenticate,
  async (req, res, next) => {
    try {
      const { breakId } = req.params;
      const userId = req.user.id;
      const endTime = new Date();

      // 休憩記録を取得
      const breakEntry = await prisma.breakEntry.findFirst({
        where: {
          id: breakId,
          timeEntry: {
            userId
          }
        },
        include: {
          timeEntry: true
        }
      });

      if (!breakEntry) {
        throw new AppError('休憩記録が見つかりません', 404);
      }

      if (breakEntry.endTime) {
        throw new AppError('既に休憩は終了しています', 400);
      }

      // 休憩時間を計算（分）
      const duration = (endTime - breakEntry.startTime) / (1000 * 60);

      // 休憩記録を更新
      const updatedBreakEntry = await prisma.breakEntry.update({
        where: { id: breakId },
        data: {
          endTime,
          duration
        }
      });

      res.json({
        status: 'success',
        data: { breakEntry: updatedBreakEntry },
        message: '休憩を終了しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告追加
router.post('/work-report/:timeEntryId',
  authenticate,
  [
    body('taskTitle').notEmpty().withMessage('作業タイトルは必須です'),
    body('description').notEmpty().withMessage('作業内容は必須です'),
    body('category').isIn(['DEVELOPMENT', 'DESIGN', 'MEETING', 'RESEARCH', 'TESTING', 'DOCUMENTATION', 'REVIEW', 'MAINTENANCE', 'TRAINING', 'ADMIN', 'OTHER']).withMessage('有効なカテゴリを選択してください'),
    body('projectId').optional().isString(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('duration').optional().isFloat({ min: 0 }),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('status').optional().isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { timeEntryId } = req.params;
      const { taskTitle, description, category, projectId, startTime, endTime, duration, progress, status, priority, tags } = req.body;
      const userId = req.user.id;

      // 勤怠記録の確認
      const timeEntry = await prisma.timeEntry.findFirst({
        where: {
          id: timeEntryId,
          userId
        }
      });

      if (!timeEntry) {
        throw new AppError('勤怠記録が見つかりません', 404);
      }

      // プロジェクトの確認（指定されている場合）
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            members: {
              some: {
                userId
              }
            }
          }
        });

        if (!project) {
          throw new AppError('指定されたプロジェクトにアクセス権限がありません', 403);
        }
      }

      // 作業報告を作成
      const workReport = await prisma.workReport.create({
        data: {
          timeEntryId,
          projectId,
          taskTitle,
          description,
          category,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          duration,
          progress,
          status: status || 'IN_PROGRESS',
          priority: priority || 'MEDIUM',
          tags: tags ? JSON.stringify(tags) : null
        },
        include: {
          project: true
        }
      });

      res.status(201).json({
        status: 'success',
        data: { workReport },
        message: '作業報告を追加しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠一覧取得
router.get('/entries',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('userId').optional().isString(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { startDate, endDate, userId, status } = req.query;
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let targetUserId = currentUserId;
      if (userId && userId !== currentUserId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの勤怠情報を閲覧する権限がありません', 403);
        }
        targetUserId = userId;
      }

      const where = {
        userId: targetUserId,
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(status && { status })
      };

      const timeEntries = await prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }        },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      res.json({
        status: 'success',
        data: { timeEntries }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠承認
router.patch('/approve/:timeEntryId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('有効なアクションを選択してください'),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { timeEntryId } = req.params;
      const { action, note } = req.body;
      const approverId = req.user.id;

      const timeEntry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        include: {
          user: true
        }
      });

      if (!timeEntry) {
        throw new AppError('勤怠記録が見つかりません', 404);
      }

      // 権限チェック（会社管理者は自社のユーザーのみ、マネージャーは部下のみ）
      if (req.user.role === 'COMPANY' && timeEntry.user.companyId !== req.user.managedCompanyId) {
        throw new AppError('この勤怠記録を承認する権限がありません', 403);
      }

      if (req.user.role === 'MANAGER' && timeEntry.user.managerId !== req.user.id) {
        throw new AppError('この勤怠記録を承認する権限がありません', 403);
      }

      const updatedTimeEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedBy: approverId,
          approvedAt: new Date(),
          note: note || timeEntry.note
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { timeEntry: updatedTimeEntry },
        message: action === 'approve' ? '勤怠を承認しました' : '勤怠を拒否しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 月次勤怠レポート
router.get('/monthly-report',
  authenticate,
  [
    query('year').isInt({ min: 2020, max: 2030 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('userId').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { year, month, userId } = req.query;
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let targetUserId = currentUserId;
      if (userId && userId !== currentUserId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーのレポートを閲覧する権限がありません', 403);
        }
        targetUserId = userId;
      }      // 月の開始日と終了日
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // ユーザーの勤務設定を取得
      let workSettings = await prisma.userWorkSettings.findUnique({
        where: { userId: targetUserId }
      });      // 設定がない場合はデフォルト値を作成
      if (!workSettings) {
        workSettings = await prisma.userWorkSettings.create({
          data: {
            userId: targetUserId,
            workHours: 8,
            workStartTime: '09:00',
            workEndTime: '18:00',
            breakTime: 60,
            transportationCost: 0,
            overtimeThreshold: 8,
            timeInterval: 15
          }
        });
      }

      const overtimeThreshold = workSettings.overtimeThreshold;

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId: targetUserId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },        include: {
          user: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { date: 'asc' }
      });      // 統計情報を計算
      const totalWorkDays = timeEntries.length;
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const totalOvertimeHours = timeEntries.reduce((sum, entry) => {
        const hours = entry.workHours || 0;
        return sum + Math.max(0, hours - overtimeThreshold);
      }, 0);
      const averageHours = totalWorkDays > 0 ? totalHours / totalWorkDays : 0;// プロジェクト別作業時間（現在は未実装）
      const projectStats = {};
      // timeEntries.forEach(entry => {
      //   entry.workReports.forEach(report => {
      //     if (report.project && report.duration) {
      //       const projectName = report.project.name;
      //       if (!projectStats[projectName]) {
      //         projectStats[projectName] = { totalHours: 0, taskCount: 0 };
      //       }
      //       projectStats[projectName].totalHours += report.duration;
      //       projectStats[projectName].taskCount += 1;
      //     }
      //   });
      // });

      res.json({
        status: 'success',
        data: {
          summary: {
            year: parseInt(year),
            month: parseInt(month),
            totalWorkDays,
            totalHours: Math.round(totalHours * 100) / 100,
            totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
            averageHours: Math.round(averageHours * 100) / 100
          },
          timeEntries,
          projectStats
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告詳細取得
router.get('/work-report/:reportId',
  authenticate,
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const workReport = await prisma.workReport.findUnique({
        where: { id: reportId },
        include: {
          timeEntry: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          project: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      if (!workReport) {
        throw new AppError('作業報告が見つかりません', 404);
      }

      // 権限チェック（作成者本人または管理者のみ）
      const isOwner = workReport.timeEntry.userId === userId;
      const hasPermission = isOwner || ['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole);

      if (!hasPermission) {
        throw new AppError('この作業報告を閲覧する権限がありません', 403);
      }

      res.json({
        status: 'success',
        data: { workReport }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告編集
router.put('/work-report/:reportId',
  authenticate,
  [
    body('taskTitle').notEmpty().withMessage('作業タイトルは必須です'),
    body('description').notEmpty().withMessage('作業内容は必須です'),
    body('category').isIn(['DEVELOPMENT', 'DESIGN', 'MEETING', 'RESEARCH', 'TESTING', 'DOCUMENTATION', 'REVIEW', 'MAINTENANCE', 'TRAINING', 'ADMIN', 'OTHER']).withMessage('有効なカテゴリを選択してください'),
    body('projectId').optional().isString(),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('duration').optional().isFloat({ min: 0 }),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('status').optional().isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('tags').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { reportId } = req.params;
      const { taskTitle, description, category, projectId, startTime, endTime, duration, progress, status, priority, tags } = req.body;
      const userId = req.user.id;

      // 作業報告の確認
      const existingReport = await prisma.workReport.findUnique({
        where: { id: reportId },
        include: {
          timeEntry: true
        }
      });

      if (!existingReport) {
        throw new AppError('作業報告が見つかりません', 404);
      }

      // 権限チェック（作成者本人のみ）
      if (existingReport.timeEntry.userId !== userId) {
        throw new AppError('この作業報告を編集する権限がありません', 403);
      }

      // プロジェクトの確認（指定されている場合）
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            members: {
              some: { userId }
            }
          }
        });

        if (!project) {
          throw new AppError('指定されたプロジェクトにアクセス権限がありません', 403);
        }
      }

      // 作業報告を更新
      const updatedWorkReport = await prisma.workReport.update({
        where: { id: reportId },
        data: {
          taskTitle,
          description,
          category,
          projectId,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          duration,
          progress,
          status: status || 'IN_PROGRESS',
          priority: priority || 'MEDIUM',
          tags: tags ? JSON.stringify(tags) : null
        },
        include: {
          project: true
        }
      });

      res.json({
        status: 'success',
        data: { workReport: updatedWorkReport },
        message: '作業報告を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告削除
router.delete('/work-report/:reportId',
  authenticate,
  async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      // 作業報告の確認
      const workReport = await prisma.workReport.findUnique({
        where: { id: reportId },
        include: {
          timeEntry: true
        }
      });

      if (!workReport) {
        throw new AppError('作業報告が見つかりません', 404);
      }

      // 権限チェック（作成者本人のみ）
      if (workReport.timeEntry.userId !== userId) {
        throw new AppError('この作業報告を削除する権限がありません', 403);
      }

      // 作業報告を削除
      await prisma.workReport.delete({
        where: { id: reportId }
      });

      res.json({
        status: 'success',
        message: '作業報告を削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告一覧取得（検索・フィルタリング対応）
router.get('/work-reports',
  authenticate,
  async (req, res, next) => {
    try {
      const { 
        userId: targetUserId, 
        projectId, 
        category, 
        status, 
        priority,
        startDate, 
        endDate,
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの作業報告を閲覧する権限がありません', 403);
        }
        queryUserId = targetUserId;
      }

      // フィルタ条件の構築
      const where = {
        timeEntry: {
          userId: queryUserId,
          ...(startDate && { date: { gte: new Date(startDate) } }),
          ...(endDate && { date: { lte: new Date(endDate) } })
        },
        ...(projectId && { projectId }),
        ...(category && { category }),
        ...(status && { status }),
        ...(priority && { priority })
      };

      // ソート条件の構築
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // ページネーション
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [workReports, totalCount] = await Promise.all([
        prisma.workReport.findMany({
          where,
          include: {
            timeEntry: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true }
                }
              }
            },
            project: {
              select: { id: true, name: true, description: true }
            }
          },
          orderBy,
          skip,
          take: parseInt(limit)
        }),
        prisma.workReport.count({ where })
      ]);

      res.json({
        status: 'success',
        data: {
          workReports,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト別作業報告統計
router.get('/work-reports/project-stats',
  authenticate,
  async (req, res, next) => {
    try {
      const { 
        userId: targetUserId, 
        startDate, 
        endDate,
        projectId 
      } = req.query;
      
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの統計情報を閲覧する権限がありません', 403);
        }
        queryUserId = targetUserId;
      }

      // フィルタ条件の構築
      const where = {
        timeEntry: {
          userId: queryUserId,
          ...(startDate && { date: { gte: new Date(startDate) } }),
          ...(endDate && { date: { lte: new Date(endDate) } })
        },
        ...(projectId && { projectId })
      };

      // プロジェクト別統計情報を取得
      const projectStats = await prisma.workReport.groupBy({
        by: ['projectId'],
        where,
        _count: {
          id: true
        },
        _sum: {
          duration: true,
          progress: true
        },
        _avg: {
          progress: true
        }
      });

      // プロジェクト情報を取得
      const projectIds = projectStats.map(stat => stat.projectId).filter(Boolean);
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, description: true }
      });

      // 統計情報にプロジェクト情報を付加
      const enrichedStats = projectStats.map(stat => {
        const project = projects.find(p => p.id === stat.projectId);
        return {
          project: project || { id: null, name: 'プロジェクト未指定', description: null },
          taskCount: stat._count.id,
          totalDuration: Math.round((stat._sum.duration || 0) * 100) / 100,
          averageProgress: Math.round((stat._avg.progress || 0) * 100) / 100
        };
      });

      // カテゴリ別統計も取得
      const categoryStats = await prisma.workReport.groupBy({
        by: ['category'],
        where,
        _count: {
          id: true
        },
        _sum: {
          duration: true
        }
      });

      // ステータス別統計も取得
      const statusStats = await prisma.workReport.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true
        }
      });

      res.json({
        status: 'success',
        data: {
          projectStats: enrichedStats,
          categoryStats,
          statusStats,
          summary: {
            totalTasks: projectStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalDuration: Math.round(projectStats.reduce((sum, stat) => sum + (stat._sum.duration || 0), 0) * 100) / 100
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 作業報告の重複・類似タスク検出
router.get('/work-reports/duplicate-detection',
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId, days = 30 } = req.query;
      const userId = req.user.id;

      // 指定期間内の作業報告を取得
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const where = {
        timeEntry: {
          userId,
          date: { gte: startDate }
        },
        ...(projectId && { projectId })
      };

      const workReports = await prisma.workReport.findMany({
        where,
        select: {
          id: true,
          taskTitle: true,
          description: true,
          category: true,
          duration: true,
          createdAt: true,
          project: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 類似タスクの検出（簡単な文字列マッチング）
      const similarTasks = [];
      for (let i = 0; i < workReports.length; i++) {
        for (let j = i + 1; j < workReports.length; j++) {
          const task1 = workReports[i];
          const task2 = workReports[j];
          
          // タイトルの類似度チェック（簡単な実装）
          const similarity = calculateSimilarity(task1.taskTitle, task2.taskTitle);
          if (similarity > 0.7) { // 70%以上の類似度
            similarTasks.push({
              task1,
              task2,
              similarity: Math.round(similarity * 100)
            });
          }
        }
      }

      res.json({
        status: 'success',
        data: {
          similarTasks,
          totalReports: workReports.length,
          duplicateCount: similarTasks.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 文字列類似度計算（レーベンシュタイン距離ベース）
function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// テスト用エンドポイント（認証なし）
router.get('/test', (req, res) => {
  res.json({ message: 'Attendance API is working', timestamp: new Date() });
});

// 休憩時間プリセットの管理

// 休憩時間プリセット一覧取得
router.get('/break-presets',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
        // デフォルトプリセットのみ返す（DBに依存しない）
      const defaultPresets = [
        {
          id: 1,
          name: '昼休み',
          startTime: '12:00',
          endTime: '13:00',
          type: 'LUNCH',
          isDefault: true
        },
        {
          id: 2,
          name: '短時間休憩',
          startTime: '15:00',
          endTime: '15:15',
          type: 'SHORT',
          isDefault: true
        }
      ];

      res.json({
        status: 'success',
        data: {
          presets: defaultPresets
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休憩時間プリセット作成（現在は無効）
router.post('/break-presets',
  authenticate,
  async (req, res, next) => {
    try {
      res.json({
        status: 'success',
        message: 'プリセット機能は開発中です'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休憩時間プリセット削除（現在は無効）
router.delete('/break-presets/:id',
  authenticate,
  async (req, res, next) => {
    try {
      res.json({
        status: 'success',
        message: 'プリセット機能は開発中です'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 月次勤怠データ取得（フロントエンド用）
router.get('/monthly/:year/:month',
  authenticate,  async (req, res, next) => {
    try {
      const { year, month } = req.params;
      const { userId } = req.query;
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      // バリデーション
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      if (!yearNum || yearNum < 2020 || yearNum > 2030) {
        throw new AppError('有効な年を指定してください（2020-2030）', 400);
      }
      
      if (!monthNum || monthNum < 1 || monthNum > 12) {
        throw new AppError('有効な月を指定してください（1-12）', 400);
      }

      // 権限チェック
      let targetUserId = currentUserId;
      if (userId && userId !== currentUserId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの勤怠情報を閲覧する権限がありません', 403);
        }
        targetUserId = userId;
      }

      // 月の開始日と終了日
      const startDate = new Date(yearNum, monthNum - 1, 1);      const endDate = new Date(yearNum, monthNum, 0);

      // ユーザーの勤務設定を取得
      let workSettings = await prisma.userWorkSettings.findUnique({
        where: { userId: targetUserId }
      });

      // 設定がない場合はデフォルト値を作成
      if (!workSettings) {
        workSettings = await prisma.userWorkSettings.create({
          data: {
            userId: targetUserId,
            workHours: 8,
            workStartTime: '09:00',
            workEndTime: '18:00',
            breakTime: 60,
            transportationCost: 0,
            overtimeThreshold: 8,
            timeInterval: 15
          }
        });
      }

      const overtimeThreshold = workSettings.overtimeThreshold;

      // 勤怠データを取得
      const attendanceData = await prisma.timeEntry.findMany({
        where: {
          userId: targetUserId,
          date: {
            gte: startDate,
            lte: endDate
          }        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { date: 'asc' }
      });// 日付をキーとしたオブジェクトに変換
      const attendanceByDate = {};
      attendanceData.forEach(entry => {        const dateKey = entry.date.toISOString().split('T')[0];
        
        // 休憩時間を考慮した実働時間を計算
        let actualWorkHours = 0;
        if (entry.clockIn && entry.clockOut) {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = new Date(entry.clockOut);
          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = entry.breakTime || workSettings.breakTime || 60;
          actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
        }
        
        attendanceByDate[dateKey] = {
          id: entry.id,
          date: entry.date,          // 時刻データを正しく表示（JST時刻として保存されているため、ローカル時刻として表示）
          clockIn: entry.clockIn ? 
            entry.clockIn.toTimeString().substring(0, 5) + ' JST' : null,
          clockOut: entry.clockOut ? 
            entry.clockOut.toTimeString().substring(0, 5) + ' JST' : null,
          clockInRaw: entry.clockIn, // デバッグ用
          clockOutRaw: entry.clockOut, // デバッグ用
          breakTime: entry.breakTime || workSettings.breakTime || 60,
          workHours: Math.round(actualWorkHours * 100) / 100,
          overtimeHours: Math.max(0, Math.round((actualWorkHours - overtimeThreshold) * 100) / 100),
          status: entry.status,
          note: entry.note,
          leaveType: entry.leaveType,
          transportationCost: entry.transportationCost
        };
      });      // 統計情報を計算
      const workDays = attendanceData.filter(entry => entry.clockIn && entry.clockOut).length; // 実際に出勤した日数
      
      // 休憩時間を考慮した実働時間で統計計算
      let totalHours = 0;
      let overtimeHours = 0;
      
      attendanceData.forEach(entry => {
        if (entry.clockIn && entry.clockOut) {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = new Date(entry.clockOut);
          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = entry.breakTime || workSettings.breakTime || 60;
          const actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
          
          totalHours += actualWorkHours;
          overtimeHours += Math.max(0, actualWorkHours - overtimeThreshold);
        }
      });
      const averageHours = workDays > 0 ? totalHours / workDays : 0;
      const leaveDays = attendanceData.filter(entry => entry.leaveType && entry.leaveType !== '').length;      const lateCount = attendanceData.filter(entry => {
        if (!entry.clockIn) return false;
        const clockInTime = new Date(entry.clockIn);
        const expectedTime = new Date(clockInTime);
        
        // ユーザーの勤務開始時間を動的に設定
        const workStartTime = workSettings.workStartTime || '09:00';
        const [workStartHour, workStartMinute] = workStartTime.split(':').map(Number);
        expectedTime.setHours(workStartHour, workStartMinute, 0, 0);
        
        return clockInTime > expectedTime;
      }).length;
      const transportationCost = attendanceData.reduce((sum, entry) => sum + (entry.transportationCost || 0), 0);      // 承認済み・未承認の件数
      const approvedCount = attendanceData.filter(entry => entry.status === 'APPROVED').length;
      const pendingCount = attendanceData.filter(entry => entry.status === 'PENDING').length;
      const rejectedCount = attendanceData.filter(entry => entry.status === 'REJECTED').length;

      res.json({
        status: 'success',
        data: {
          attendanceData: attendanceByDate,          monthlyStats: {
            year: yearNum,
            month: monthNum,
            workDays,
            totalHours: Math.round(totalHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            averageHours: Math.round(averageHours * 100) / 100,
            leaveDays,
            lateCount,
            transportationCost,
            approvedCount,
            pendingCount,
            rejectedCount
          }
        }
      });
    } catch (error) {
      console.error('Error in monthly data retrieval:', error);
      next(error);
    }
  }
);

// 勤務設定取得API
router.get('/work-settings',
  authenticate,
  async (req, res, next) => {    try {
      const userId = req.user.id;

      // ユーザー個人の勤務設定を取得
      let workSettings = await prisma.userWorkSettings.findUnique({
        where: { userId }
      });

      if (!workSettings) {
        workSettings = await prisma.userWorkSettings.create({
          data: {
            userId,
            workHours: 8.0,
            workStartTime: '09:00',
            workEndTime: '18:00',
            breakTime: 60,
            overtimeThreshold: 8,
            transportationCost: 0,
            timeInterval: 15
          }
        });
      }res.json({
        status: 'success',
        data: {
          standardHours: workSettings.workHours,
          breakTime: workSettings.breakTime,
          overtimeThreshold: workSettings.overtimeThreshold,
          defaultTransportationCost: workSettings.transportationCost,
          timeInterval: workSettings.timeInterval
        }
      });
    } catch (error) {
      console.error('Error in work-settings GET:', error);
      next(error);
    }
  }
);

// 勤務設定更新API
router.post('/work-settings',
  authenticate,
  [
    body('standardWorkHours').optional().isInt({ min: 1, max: 24 }).withMessage('勤務時間は1-24時間で設定してください'),
    body('breakTime').optional().isInt({ min: 0, max: 480 }).withMessage('休憩時間は0-480分で設定してください'),
    body('overtimeThreshold').optional().isInt({ min: 1, max: 24 }).withMessage('残業基準時間は1-24時間で設定してください'),
    body('defaultTransportationCost').optional().isInt({ min: 0 }).withMessage('デフォルト交通費は0以上で設定してください'),
    body('timeInterval').optional().isIn([15, 30]).withMessage('時間間隔は15分または30分を選択してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { standardWorkHours, breakTime, overtimeThreshold, defaultTransportationCost, timeInterval } = req.body;
      const userId = req.user.id;      // 既存の勤務設定を検索
      let workSettings = await prisma.userWorkSettings.findUnique({
        where: { userId }
      });

      const updateData = {};
      if (standardWorkHours !== undefined) updateData.workHours = standardWorkHours;
      if (breakTime !== undefined) updateData.breakTime = breakTime;
      if (defaultTransportationCost !== undefined) updateData.transportationCost = defaultTransportationCost;
      if (overtimeThreshold !== undefined) updateData.overtimeThreshold = overtimeThreshold;
      if (timeInterval !== undefined) updateData.timeInterval = timeInterval;      if (workSettings) {
        workSettings = await prisma.userWorkSettings.update({
          where: { id: workSettings.id },
          data: updateData
        });      } else {
        workSettings = await prisma.userWorkSettings.create({
          data: {
            userId,
            workHours: standardWorkHours || 8,
            workStartTime: '09:00',
            workEndTime: '18:00',
            breakTime: breakTime || 60,
            transportationCost: defaultTransportationCost || 0,
            overtimeThreshold: overtimeThreshold || 8,
            timeInterval: timeInterval || 15
          }
        });
      }res.json({
        status: 'success',
        data: workSettings,
        message: '勤務設定を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠データ統一更新API
router.post('/update', 
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('clockIn').optional().isString(),
    body('clockOut').optional().isString(),
    body('breakTime').optional().isInt({ min: 0 }),
    body('transportationCost').optional().isInt({ min: 0 }),
    body('workReport').optional().isString(),    body('leaveType').optional().isString(),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }      const { date, clockIn, clockOut, breakTime, transportationCost, workReport, leaveType, note } = req.body;
      const userId = req.user.id;      // 時間文字列をJST DateTimeに変換するヘルパー関数
      const convertTimeStringToDateTime = (timeString, baseDate) => {
        if (!timeString || typeof timeString !== 'string') {
          return null;
        }
        
        try {
          const timeParts = timeString.split(':');
          if (timeParts.length !== 2) {
            return null;
          }
          
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          
          if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
          }
          
          // JST時刻として正確に設定（年月日を指定して時分を設定）
          const year = baseDate.getFullYear();
          const month = baseDate.getMonth();
          const day = baseDate.getDate();
          
          // JST時刻としてDateオブジェクトを作成（UTCとして作成してから+9時間分調整）
          const jstDate = new Date(year, month, day, hours, minutes, 0, 0);
          
          return jstDate;
        } catch (error) {
          return null;
        }
      };

      const baseDate = new Date(date);

      // 既存の勤怠記録を検索
      let timeEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          date: baseDate
        }
      });      const updateData = {};
      if (clockIn !== undefined) {
        const convertedClockIn = convertTimeStringToDateTime(clockIn, baseDate);
        if (convertedClockIn === null) {
          throw new AppError(`無効な出勤時刻です: ${clockIn}`, 400);
        }
        updateData.clockIn = convertedClockIn;
      }
      if (clockOut !== undefined) {
        const convertedClockOut = convertTimeStringToDateTime(clockOut, baseDate);
        if (convertedClockOut === null) {
          throw new AppError(`無効な退勤時刻です: ${clockOut}`, 400);
        }
        updateData.clockOut = convertedClockOut;
      }
      if (breakTime !== undefined) updateData.breakTime = breakTime;
      if (transportationCost !== undefined) updateData.transportationCost = transportationCost;
      if (workReport !== undefined) updateData.workSummary = workReport;
      if (leaveType !== undefined) updateData.leaveType = leaveType;
      if (note !== undefined) updateData.note = note;

      // 作業時間の自動計算
      if (updateData.clockIn && updateData.clockOut) {
        const workMinutes = (updateData.clockOut - updateData.clockIn) / (1000 * 60);
        const breakMinutes = updateData.breakTime || timeEntry?.breakTime || 0;
        updateData.workHours = Math.max(0, (workMinutes - breakMinutes) / 60);
      } else if (timeEntry && (updateData.clockIn || updateData.clockOut)) {
        // 片方だけが更新された場合
        const existingClockIn = updateData.clockIn || timeEntry.clockIn;
        const existingClockOut = updateData.clockOut || timeEntry.clockOut;
        const existingBreakTime = updateData.breakTime !== undefined ? updateData.breakTime : timeEntry.breakTime;
        
        if (existingClockIn && existingClockOut) {
          const workMinutes = (existingClockOut - existingClockIn) / (1000 * 60);
          updateData.workHours = Math.max(0, (workMinutes - (existingBreakTime || 0)) / 60);        }
      }


      if (timeEntry) {
        // 既存記録を更新
        timeEntry = await prisma.timeEntry.update({
          where: { id: timeEntry.id },
          data: updateData
        });      } else {
        // 新規作成
        timeEntry = await prisma.timeEntry.create({
          data: {
            userId,
            date: baseDate,
            status: 'PENDING',
            ...updateData
          }
        });
      }      res.json({
        status: 'success',
        data: { timeEntry },
        message: '勤怠データを更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 業務レポート更新API
router.post('/work-report',
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('workSummary').optional().isString(),
    body('achievements').optional().isString(),
    body('challenges').optional().isString(),
    body('nextDayPlan').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { date, workSummary, achievements, challenges, nextDayPlan } = req.body;
      const userId = req.user.id;

      // 既存の勤怠記録を検索または作成
      let timeEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          date: new Date(date)
        }
      });

      // 業務レポートの内容をJSONとして統合
      const workReport = {
        workSummary: workSummary || '',
        achievements: achievements || '',
        challenges: challenges || '',
        nextDayPlan: nextDayPlan || ''
      };

      const updateData = {
        note: JSON.stringify(workReport)
      };

      if (timeEntry) {
        timeEntry = await prisma.timeEntry.update({
          where: { id: timeEntry.id },
          data: updateData
        });
      } else {
        timeEntry = await prisma.timeEntry.create({
          data: {
            userId,
            date: new Date(date),
            status: 'PENDING',
            ...updateData
          }
        });
      }      res.json({
        status: 'success',
        data: { timeEntry },
        message: '業務レポートを保存しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========== 管理者向け勤務設定管理 ==========

// 管理下のユーザー一覧取得（勤務設定付き）
router.get('/admin/users-work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const userRole = req.user.role;
      
      // 基本的なクエリ条件
      let whereCondition = {};
      
      // 権限に応じてアクセス可能なユーザーを制限
      if (userRole === 'COMPANY') {
        if (!req.user.managedCompanyId) {
          throw new AppError('管理者が会社に関連付けられていません', 403);
        }
        whereCondition.companyId = req.user.managedCompanyId;
      } else if (userRole === 'MANAGER') {
        if (!req.user.companyId) {
          throw new AppError('マネージャーが会社に関連付けられていません', 403);
        }
        whereCondition.companyId = req.user.companyId;
      }
      
      // 検索条件
      if (search) {
        whereCondition.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // ページネーション設定
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      // ユーザー取得
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          include: {
            workSettings: true,
            company: {
              select: { id: true, name: true }
            }
          },
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' }
          ],
          skip,
          take
        }),
        prisma.user.count({ where: whereCondition })
      ]);
      
      res.json({
        status: 'success',
        data: {
          users: users.map(user => ({
            id: user.id,
            name: `${user.lastName} ${user.firstName}`,
            email: user.email,
            company: user.company?.name,
            workSettings: user.workSettings || {
              workHours: 8.0,
              workStartTime: '09:00',
              workEndTime: '18:00',
              breakTime: 60,
              overtimeThreshold: 8,
              transportationCost: 0,
              timeInterval: 15
            }
          })),
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 個別ユーザーの勤務設定更新
router.put('/admin/user-work-settings/:userId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('workHours').optional().isFloat({ min: 1, max: 24 }).withMessage('勤務時間は1〜24時間の範囲で入力してください'),
    body('workStartTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('開始時間の形式が正しくありません（HH:MM）'),
    body('workEndTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('終了時間の形式が正しくありません（HH:MM）'),
    body('breakTime').optional().isInt({ min: 0, max: 480 }).withMessage('休憩時間は0〜480分の範囲で入力してください'),
    body('overtimeThreshold').optional().isInt({ min: 1, max: 24 }).withMessage('残業基準時間は1〜24時間の範囲で入力してください'),
    body('transportationCost').optional().isInt({ min: 0 }).withMessage('交通費は0以上の整数で入力してください'),
    body('timeInterval').optional().isInt({ min: 1, max: 60 }).withMessage('時間間隔は1〜60分の範囲で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { userId } = req.params;
      const { workHours, workStartTime, workEndTime, breakTime, overtimeThreshold, transportationCost, timeInterval } = req.body;
      
      // 対象ユーザーの権限チェック
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true }
      });
      
      if (!targetUser) {
        throw new AppError('ユーザーが見つかりません', 404);
      }
      
      // 権限確認
      const userRole = req.user.role;
      if (userRole === 'COMPANY') {
        if (targetUser.companyId !== req.user.managedCompanyId) {
          throw new AppError('このユーザーの設定を変更する権限がありません', 403);
        }
      } else if (userRole === 'MANAGER') {
        if (targetUser.companyId !== req.user.companyId) {
          throw new AppError('このユーザーの設定を変更する権限がありません', 403);
        }
      }
      
      // 更新データの準備
      const updateData = {};
      if (workHours !== undefined) updateData.workHours = workHours;
      if (workStartTime !== undefined) updateData.workStartTime = workStartTime;
      if (workEndTime !== undefined) updateData.workEndTime = workEndTime;
      if (breakTime !== undefined) updateData.breakTime = breakTime;
      if (overtimeThreshold !== undefined) updateData.overtimeThreshold = overtimeThreshold;
      if (transportationCost !== undefined) updateData.transportationCost = transportationCost;
      if (timeInterval !== undefined) updateData.timeInterval = timeInterval;
      
      // 勤務設定の更新または作成
      const workSettings = await prisma.userWorkSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          workHours: workHours || 8.0,
          workStartTime: workStartTime || '09:00',
          workEndTime: workEndTime || '18:00',
          breakTime: breakTime || 60,
          overtimeThreshold: overtimeThreshold || 8,
          transportationCost: transportationCost || 0,
          timeInterval: timeInterval || 15
        }
      });
      
      res.json({
        status: 'success',
        data: { workSettings },
        message: `${targetUser.lastName} ${targetUser.firstName}さんの勤務設定を更新しました`
      });
    } catch (error) {
      next(error);
    }
  }
);

// 一括勤務設定更新
router.put('/admin/bulk-work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('userIds').isArray().withMessage('ユーザーIDの配列が必要です'),
    body('userIds.*').isString().withMessage('無効なユーザーIDです'),
    body('workHours').optional().isFloat({ min: 0.1, max: 24 }).withMessage('勤務時間は0.1〜24時間の範囲で入力してください'),
    body('workStartTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('開始時間の形式が正しくありません（HH:MM）'),
    body('workEndTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('終了時間の形式が正しくありません（HH:MM）'),
    body('breakTime').optional().isInt({ min: 0, max: 480 }).withMessage('休憩時間は0〜480分の範囲で入力してください'),
    body('overtimeThreshold').optional().isFloat({ min: 0, max: 24 }).withMessage('残業基準時間は0〜24時間の範囲で入力してください'),
    body('transportationCost').optional().isInt({ min: 0 }).withMessage('交通費は0以上の整数で入力してください'),
    body('timeInterval').optional().isInt({ min: 1, max: 60 }).withMessage('時間間隔は1〜60分の範囲で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { userIds, workHours, workStartTime, workEndTime, breakTime, overtimeThreshold, transportationCost, timeInterval } = req.body;
      
      if (!userIds || userIds.length === 0) {
        throw new AppError('更新対象のユーザーを選択してください', 400);
      }
      
      // 対象ユーザーの権限チェック
      const userRole = req.user.role;
      let whereCondition = { id: { in: userIds } };
      
      if (userRole === 'COMPANY') {
        whereCondition.companyId = req.user.managedCompanyId;
      } else if (userRole === 'MANAGER') {
        whereCondition.companyId = req.user.companyId;
      }
      
      const targetUsers = await prisma.user.findMany({
        where: whereCondition,
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (targetUsers.length !== userIds.length) {
        throw new AppError('一部のユーザーに対する権限がありません', 403);
      }
      
      // 更新データの準備
      const updateData = {};
      if (workHours !== undefined) updateData.workHours = workHours;
      if (workStartTime !== undefined) updateData.workStartTime = workStartTime;
      if (workEndTime !== undefined) updateData.workEndTime = workEndTime;
      if (breakTime !== undefined) updateData.breakTime = breakTime;
      if (overtimeThreshold !== undefined) updateData.overtimeThreshold = overtimeThreshold;
      if (transportationCost !== undefined) updateData.transportationCost = transportationCost;
      if (timeInterval !== undefined) updateData.timeInterval = timeInterval;
      
      // 一括更新実行
      const results = await Promise.all(
        userIds.map(async (userId) => {
          return await prisma.userWorkSettings.upsert({
            where: { userId },
            update: updateData,
            create: {
              userId,
              workHours: workHours || 8.0,
              workStartTime: workStartTime || '09:00',
              workEndTime: workEndTime || '18:00',
              breakTime: breakTime || 60,
              overtimeThreshold: overtimeThreshold || 8,
              transportationCost: transportationCost || 0,
              timeInterval: timeInterval || 15
            }
          });
        })
      );
      
      res.json({
        status: 'success',
        data: { 
          updatedCount: results.length,
          users: targetUsers.map(user => `${user.lastName} ${user.firstName}`)
        },
        message: `${results.length}名のユーザーの勤務設定を一括更新しました`
      });
    } catch (error) {
      next(error);
    }
  }
);

// 会社全体のデフォルト勤務設定取得
router.get('/admin/company-default-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  async (req, res, next) => {
    try {
      const userRole = req.user.role;
      let companyId;
      
      if (userRole === 'COMPANY') {
        companyId = req.user.managedCompanyId;
      } else {
        // ADMIN の場合はクエリパラメータから取得
        companyId = req.query.companyId;
      }
      
      if (!companyId) {
        throw new AppError('会社IDが指定されていません', 400);
      }
      
      // 会社の基本情報取得
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true }
      });
      
      if (!company) {
        throw new AppError('会社が見つかりません', 404);
      }
      
      // デフォルト設定として返すべき値
      const defaultSettings = {
        workHours: 8.0,
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakTime: 60,
        overtimeThreshold: 8,
        transportationCost: 0,
        timeInterval: 15
      };
      
      res.json({
        status: 'success',
        data: {
          company,
          defaultSettings
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 交通費一括登録
router.post('/bulk-transportation',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  [
    body('registrations').isArray().withMessage('登録データの配列が必要です'),
    body('registrations.*.userId').isString().withMessage('無効なユーザーIDです'),
    body('registrations.*.amount').isInt({ min: 0 }).withMessage('交通費は0以上の整数で入力してください'),
    body('registrations.*.year').isInt({ min: 2020, max: 2030 }).withMessage('有効な年を入力してください'),
    body('registrations.*.month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { registrations } = req.body;
      
      if (!registrations || registrations.length === 0) {
        throw new AppError('登録データが空です', 400);
      }

      // 権限チェック（対象ユーザーが管理下にあるかチェック）
      const userRole = req.user.role;
      const userIds = registrations.map(reg => reg.userId);
      
      let whereCondition = { id: { in: userIds } };
      
      if (userRole === 'COMPANY') {
        whereCondition.companyId = req.user.managedCompanyId;
      } else if (userRole === 'MANAGER') {
        whereCondition.companyId = req.user.companyId;
      }
      
      const targetUsers = await prisma.user.findMany({
        where: whereCondition,
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (targetUsers.length !== userIds.length) {
        throw new AppError('一部のユーザーに対する権限がありません', 403);
      }

      // 各登録データについて、その月の営業日の勤怠データを更新
      let totalUpdatedRecords = 0;
      
      for (const registration of registrations) {
        const { userId, amount, year, month } = registration;
        
        // その月の営業日を取得（土日を除く）
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const workingDates = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay();
          // 土日を除く（0=日曜日, 6=土曜日）
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDates.push(new Date(d));
          }
        }

        // 各営業日の勤怠データを更新（出勤記録がある日のみ、または全営業日に作成）
        for (const workDate of workingDates) {
          await prisma.timeEntry.upsert({
            where: {
              userId_date: {
                userId,
                date: workDate
              }
            },
            update: {
              transportationCost: amount
            },
            create: {
              userId,
              date: workDate,
              transportationCost: amount,
              status: 'PENDING'
            }
          });
          totalUpdatedRecords++;
        }
      }

      res.json({
        status: 'success',
        data: {
          updatedRecords: totalUpdatedRecords,
          updatedUsers: targetUsers.length,
          users: targetUsers.map(user => `${user.lastName} ${user.firstName}`)
        },
        message: `${targetUsers.length}名のユーザーの交通費を一括登録しました（${totalUpdatedRecords}件の記録を更新）`
      });
    } catch (error) {
      next(error);
    }
  }
);

// 承認待ち勤怠記録の一覧取得（COMPANY/MANAGER用）
router.get('/pending-approval', 
  authenticate,
  authorize(['COMPANY', 'MANAGER']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('ページは1以上の整数である必要があります'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('制限は1-100の整数である必要があります'),
    query('startDate').optional().isISO8601().withMessage('有効な開始日を入力してください'),
    query('endDate').optional().isISO8601().withMessage('有効な終了日を入力してください'),
    query('userId').optional().isString().withMessage('有効なユーザーIDを入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { page = 1, limit = 20, startDate, endDate, userId } = req.query;
      const offset = (page - 1) * limit;

      // 会社IDの取得
      let companyId;
      if (req.user.role === 'COMPANY') {
        companyId = req.user.companyId || req.user.managedCompanyId;
      } else if (req.user.role === 'MANAGER') {
        companyId = req.user.companyId;
      }

      if (!companyId) {
        throw new AppError('会社情報が見つかりません', 400);
      }

      // クエリ条件構築
      const where = {
        status: 'PENDING',
        user: {
          companyId: companyId
        }
      };

      if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
      if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
      if (userId) where.userId = userId;

      const [timeEntries, totalCount] = await Promise.all([
        prisma.timeEntry.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                position: true
              }
            }
          },
          orderBy: { date: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.timeEntry.count({ where })
      ]);

      res.json({
        status: 'success',
        data: {
          timeEntries,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠記録の承認/却下
router.patch('/approve/:id', 
  authenticate,
  authorize(['COMPANY', 'MANAGER']),
  [
    body('action').isIn(['APPROVED', 'REJECTED']).withMessage('アクションはAPPROVEDまたはREJECTEDである必要があります'),
    body('approvalNote').optional().isString().withMessage('承認コメントは文字列である必要があります')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { id } = req.params;
      const { action, approvalNote } = req.body;

      // 勤怠記録の存在確認と権限チェック
      const timeEntry = await prisma.timeEntry.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyId: true
            }
          }
        }
      });

      if (!timeEntry) {
        throw new AppError('勤怠記録が見つかりません', 404);
      }

      // 会社権限チェック
      let userCompanyId;
      if (req.user.role === 'COMPANY') {
        userCompanyId = req.user.companyId || req.user.managedCompanyId;
      } else if (req.user.role === 'MANAGER') {
        userCompanyId = req.user.companyId;
      }

      if (userCompanyId !== timeEntry.user.companyId) {
        throw new AppError('この勤怠記録を承認する権限がありません', 403);
      }

      if (timeEntry.status !== 'PENDING') {
        throw new AppError('この勤怠記録は既に処理済みです', 400);
      }

      // 承認/却下の実行
      const updatedTimeEntry = await prisma.timeEntry.update({
        where: { id },
        data: {
          status: action,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          approvalNote: approvalNote || null
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        status: 'success',
        data: { timeEntry: updatedTimeEntry },
        message: action === 'APPROVED' ? '勤怠記録を承認しました' : '勤怠記録を却下しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務統計の取得（COMPANY用）
router.get('/company-stats', 
  authenticate,
  authorize(['COMPANY', 'MANAGER']),
  [
    query('startDate').optional().isISO8601().withMessage('有効な開始日を入力してください'),
    query('endDate').optional().isISO8601().withMessage('有効な終了日を入力してください'),
    query('period').optional().isIn(['week', 'month', 'quarter']).withMessage('期間はweek, month, quarterのいずれかである必要があります')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { startDate, endDate, period = 'month' } = req.query;

      // 会社IDの取得
      let companyId;
      if (req.user.role === 'COMPANY') {
        companyId = req.user.companyId || req.user.managedCompanyId;
      } else if (req.user.role === 'MANAGER') {
        companyId = req.user.companyId;
      }

      if (!companyId) {
        throw new AppError('会社情報が見つかりません', 400);
      }

      // 期間設定
      let dateRange = {};
      if (startDate && endDate) {
        dateRange = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else {
        const now = new Date();
        const start = new Date();
        
        switch (period) {
          case 'week':
            start.setDate(now.getDate() - 7);
            break;
          case 'quarter':
            start.setMonth(now.getMonth() - 3);
            break;
          case 'month':
          default:
            start.setMonth(now.getMonth() - 1);
            break;
        }
        
        dateRange = {
          gte: start,
          lte: now
        };
      }

      // 基本統計の取得
      const [totalRecords, approvedRecords, pendingRecords, rejectedRecords] = await Promise.all([
        prisma.timeEntry.count({
          where: {
            date: dateRange,
            user: { companyId }
          }
        }),
        prisma.timeEntry.count({
          where: {
            date: dateRange,
            status: 'APPROVED',
            user: { companyId }
          }
        }),
        prisma.timeEntry.count({
          where: {
            date: dateRange,
            status: 'PENDING',
            user: { companyId }
          }
        }),
        prisma.timeEntry.count({
          where: {
            date: dateRange,
            status: 'REJECTED',
            user: { companyId }
          }
        })
      ]);

      // 勤務時間統計
      const workHoursStats = await prisma.timeEntry.aggregate({
        where: {
          date: dateRange,
          status: 'APPROVED',
          user: { companyId },
          workHours: { not: null }
        },
        _avg: { workHours: true },
        _sum: { workHours: true },
        _count: { workHours: true }
      });

      // 社員別統計
      const employeeStats = await prisma.timeEntry.groupBy({
        by: ['userId'],
        where: {
          date: dateRange,
          user: { companyId }
        },
        _count: { id: true },
        _sum: { workHours: true },
        _avg: { workHours: true }
      });

      // ユーザー情報を取得
      const userIds = employeeStats.map(stat => stat.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true
        }
      });

      const employeeStatsWithNames = employeeStats.map(stat => {
        const user = users.find(u => u.id === stat.userId);
        return {
          ...stat,
          user: user || { firstName: 'Unknown', lastName: 'User' }
        };
      });

      res.json({
        status: 'success',
        data: {
          overview: {
            totalRecords,
            approvedRecords,
            pendingRecords,
            rejectedRecords,
            approvalRate: totalRecords > 0 ? (approvedRecords / totalRecords * 100).toFixed(1) : 0
          },
          workHours: {
            averageHours: workHoursStats._avg.workHours?.toFixed(2) || 0,
            totalHours: workHoursStats._sum.workHours?.toFixed(2) || 0,
            recordCount: workHoursStats._count.workHours || 0
          },
          employeeStats: employeeStatsWithNames,
          period: {
            startDate: dateRange.gte,
            endDate: dateRange.lte,
            period
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
