const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body, query } = require('express-validator');
const { AppError } = require('../middleware/error');
const { getEffectiveWorkSettings, calculateHoursFromTimes, checkLateArrival } = require('../utils/workSettings');

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
      }

      // レスポンス用にタイムゾーン情報を保持した形式に変換
      const responseTimeEntry = {
        ...timeEntry,
        clockIn: timeEntry.clockIn ? timeEntry.clockIn.toLocaleString('sv-SE', {timeZone: 'Asia/Tokyo'}) + '+09:00' : null,
        clockOut: timeEntry.clockOut ? timeEntry.clockOut.toLocaleString('sv-SE', {timeZone: 'Asia/Tokyo'}) + '+09:00' : null
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
      const workHours = (clockOutTime - timeEntry.clockIn) / (1000 * 60 * 60);

      // 勤怠記録を更新
      const updatedTimeEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          clockOut: clockOutTime,
          workHours: workHours,
          note: note || timeEntry.note,
          workSummary,
          achievements,
          challenges,
          nextDayPlan
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      // レスポンス用にタイムゾーン情報を保持した形式に変換
      const responseTimeEntry = {
        ...updatedTimeEntry,
        clockIn: updatedTimeEntry.clockIn ? updatedTimeEntry.clockIn.toLocaleString('sv-SE', {timeZone: 'Asia/Tokyo'}) + '+09:00' : null,
        clockOut: updatedTimeEntry.clockOut ? updatedTimeEntry.clockOut.toLocaleString('sv-SE', {timeZone: 'Asia/Tokyo'}) + '+09:00' : null
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
            select: { id: true, firstName: true, lastName: true, email: true }
          },
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
      }

      // 月の開始日と終了日
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // ユーザーの勤務設定を取得（統合されたヘルパー関数を使用）
      let workSettings = await getEffectiveWorkSettings(targetUserId, startDate, endDate);
      
      // 個人設定がない場合はデフォルト値を作成
      if (!workSettings.userSettings) {
        await prisma.userWorkSettings.create({
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
        });        workSettings = await getEffectiveWorkSettings(targetUserId, startDate, endDate);
      }

      const overtimeThreshold = workSettings?.effective?.overtimeThreshold || 8;

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId: targetUserId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { date: 'asc' }
      });

      // 統計情報を計算
      const totalWorkDays = timeEntries.length;
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const totalOvertimeHours = timeEntries.reduce((sum, entry) => {
        const hours = entry.workHours || 0;
        return sum + Math.max(0, hours - overtimeThreshold);
      }, 0);
      const averageHours = totalWorkDays > 0 ? totalHours / totalWorkDays : 0;

      res.json({
        status: 'success',
        data: {
          summary: {
            year: parseInt(year),
            month: parseInt(month),
            totalWorkDays,
            totalHours: Math.round(totalHours * 100) / 100,
            totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
            averageHours: Math.round(averageHours * 100) / 100          },
          timeEntries,
          workSettings: workSettings?.effective || {}
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 月次勤怠データ取得（フロントエンド用）
router.get('/monthly/:year/:month',
  authenticate,
  async (req, res, next) => {
    try {
      console.log('Monthly data request:', { params: req.params, query: req.query, user: req.user.id });
      const { year, month } = req.params;
      const { userId } = req.query;
      const currentUserId = req.user.id;
      const userRole = req.user.role;

      // バリデーション
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      console.log('Parsed values:', { yearNum, monthNum });
      
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
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);

      console.log('Date range:', { startDate, endDate, targetUserId });

      // 統合されたヘルパー関数を使用して勤務設定を取得
      const workSettings = await getEffectiveWorkSettings(targetUserId, startDate, endDate);      const overtimeThreshold = workSettings?.effective?.overtimeThreshold || 8;
      
      console.log('Effective work settings:', workSettings?.effective);

      // 勤怠データを取得
      const attendanceData = await prisma.timeEntry.findMany({
        where: {
          userId: targetUserId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { date: 'asc' }
      });

      // 日付をキーとしたオブジェクトに変換
      const attendanceByDate = {};
      attendanceData.forEach(entry => {
        const dateKey = entry.date.toISOString().split('T')[0];
        
        // 休憩時間を考慮した実働時間を計算
        let actualWorkHours = 0;
        if (entry.clockIn && entry.clockOut) {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = new Date(entry.clockOut);          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = entry.breakTime || workSettings?.effective?.breakTime || 60;
          actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
        }
        
        attendanceByDate[dateKey] = {
          id: entry.id,
          date: entry.date,
          clockIn: entry.clockIn ? 
            entry.clockIn.toLocaleString('sv-SE').split(' ')[1] + ' JST' : null,          clockOut: entry.clockOut ? 
            entry.clockOut.toLocaleString('sv-SE').split(' ')[1] + ' JST' : null,
          breakTime: entry.breakTime || workSettings?.effective?.breakTime || 60,
          workHours: Math.round(actualWorkHours * 100) / 100,
          overtimeHours: Math.max(0, Math.round((actualWorkHours - overtimeThreshold) * 100) / 100),
          status: entry.status,
          note: entry.note,
          leaveType: entry.leaveType,
          transportationCost: entry.transportationCost
        };
      });

      // 統計情報を計算
      const workDays = attendanceData.filter(entry => entry.clockIn && entry.clockOut).length;
      
      let totalHours = 0;
      let overtimeHours = 0;
      
      attendanceData.forEach(entry => {
        if (entry.clockIn && entry.clockOut) {
          const clockInTime = new Date(entry.clockIn);
          const clockOutTime = new Date(entry.clockOut);          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = entry.breakTime || workSettings?.effective?.breakTime || 60;
          const actualWorkHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
          
          totalHours += actualWorkHours;
          overtimeHours += Math.max(0, actualWorkHours - overtimeThreshold);
        }
      });
      
      const averageHours = workDays > 0 ? totalHours / workDays : 0;
      const leaveDays = attendanceData.filter(entry => entry.leaveType && entry.leaveType !== '').length;      // 遅刻判定（統合ヘルパー関数を使用）
      const lateCount = attendanceData.filter(entry => {
        if (!entry.clockIn) return false;
        // checkLateArrival関数にworkSettings.effectiveを渡す
        if (!workSettings?.effective) {
          console.warn('workSettings.effective is undefined, skipping late arrival check');
          return false;
        }
        return checkLateArrival(entry.clockIn, workSettings.effective);
      }).length;
      
      const transportationCost = attendanceData.reduce((sum, entry) => sum + (entry.transportationCost || 0), 0);
      
      // 承認済み・未承認の件数
      const approvedCount = attendanceData.filter(entry => entry.status === 'APPROVED').length;
      const pendingCount = attendanceData.filter(entry => entry.status === 'PENDING').length;
      const rejectedCount = attendanceData.filter(entry => entry.status === 'REJECTED').length;

      res.json({
        status: 'success',
        data: {
          attendanceData: attendanceByDate,
          monthlyStats: {
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
            rejectedCount          },
          workSettings: workSettings?.effective || {}
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
  async (req, res, next) => {
    try {
      console.log('Getting work settings for user:', req.user.id);
      const userId = req.user.id;
      const currentDate = new Date();

      // 統合されたヘルパー関数を使用
      const workSettings = await getEffectiveWorkSettings(userId, currentDate, currentDate);

      res.json({
        status: 'success',        data: {
          standardHours: workSettings?.effective?.workHours || 8,
          breakTime: workSettings?.effective?.breakTime || 60,
          overtimeThreshold: workSettings?.effective?.overtimeThreshold || 8,
          defaultTransportationCost: workSettings?.effective?.transportationCost || 0,
          timeInterval: workSettings?.effective?.timeInterval || 15,
          settingSource: workSettings?.effective?.settingSource || 'default',
          projectWorkSettingName: workSettings?.effective?.projectWorkSettingName || null
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
      const userId = req.user.id;

      // 既存の勤務設定を検索
      let workSettings = await prisma.userWorkSettings.findUnique({
        where: { userId }
      });

      const updateData = {};
      if (standardWorkHours !== undefined) updateData.workHours = standardWorkHours;
      if (breakTime !== undefined) updateData.breakTime = breakTime;
      if (defaultTransportationCost !== undefined) updateData.transportationCost = defaultTransportationCost;
      if (overtimeThreshold !== undefined) updateData.overtimeThreshold = overtimeThreshold;
      if (timeInterval !== undefined) updateData.timeInterval = timeInterval;

      if (workSettings) {
        workSettings = await prisma.userWorkSettings.update({
          where: { id: workSettings.id },
          data: updateData
        });
      } else {
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
      }

      res.json({
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
    body('workReport').optional().isString(),
    body('leaveType').optional().isString(),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      console.log('Update attendance request:', { body: req.body, user: req.user.id });
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { date, clockIn, clockOut, breakTime, transportationCost, workReport, leaveType, note } = req.body;
      const userId = req.user.id;

      // 時間文字列をDateTimeに変換するヘルパー関数
      const convertTimeStringToDateTime = (timeString, baseDate) => {
        if (!timeString || typeof timeString !== 'string') {
          console.log(`Invalid time string: ${timeString}`);
          return null;
        }
        
        try {
          const timeParts = timeString.split(':');
          if (timeParts.length !== 2) {
            console.log(`Invalid time format: ${timeString}`);
            return null;
          }
          
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          
          if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            console.log(`Invalid time values: hours=${hours}, minutes=${minutes}`);
            return null;
          }
          
          // JST（ローカル時刻）として設定
          const dateTime = new Date(baseDate);
          dateTime.setHours(hours, minutes, 0, 0);
          console.log(`Time conversion: ${timeString} -> ${dateTime.toISOString()} (JST input)`);
          return dateTime;
        } catch (error) {
          console.log(`Error converting time string ${timeString}:`, error);
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
      });

      const updateData = {};
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

      if (breakTime !== undefined) updateData.breakTime = parseInt(breakTime, 10);
      if (transportationCost !== undefined) updateData.transportationCost = parseInt(transportationCost, 10);
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
          updateData.workHours = Math.max(0, (workMinutes - (existingBreakTime || 0)) / 60);
        }
      }

      console.log('Final updateData before save:', updateData);

      if (timeEntry) {
        // 既存記録を更新
        timeEntry = await prisma.timeEntry.update({
          where: { id: timeEntry.id },
          data: updateData
        });
      } else {
        // 新規作成
        timeEntry = await prisma.timeEntry.create({
          data: {
            userId,
            date: baseDate,
            status: 'PENDING',
            ...updateData
          }
        });
      }

      res.json({
        status: 'success',
        data: { timeEntry },
        message: '勤怠データを更新しました'
      });
    } catch (error) {
      console.error('Error in attendance update:', error);
      next(error);
    }
  }
);

// テスト用エンドポイント（認証なし）
router.get('/test', (req, res) => {
  res.json({ message: 'Attendance API is working', timestamp: new Date() });
});

// 修正確認用テストエンドポイント（認証付き）
router.get('/test-auth', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    
    // 修正された関数のテスト
    const workSettings = await getEffectiveWorkSettings(userId, currentDate, currentDate);
    
    res.json({ 
      message: 'Authenticated test successful', 
      timestamp: new Date(),
      userId,
      workSettingsFixed: !!workSettings?.effective,
      effectiveSettings: workSettings?.effective || {}
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
