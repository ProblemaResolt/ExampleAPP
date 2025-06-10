const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body, query } = require('express-validator');
const { AppError } = require('../middleware/error');
const { getEffectiveWorkSettings, calculateHoursFromTimes, checkLateArrival } = require('../utils/workSettings');
const { isWeekendDay } = require('../utils/weekendHelper');

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

      res.json({
        status: 'success',
        data: { timeEntry },
        message: '出勤打刻が完了しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠打刻 - 退勤
router.post('/clock-out', 
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { date, note } = req.body;
      const userId = req.user.id;
      const clockOutTime = new Date();

      // 既存の勤怠記録を取得
      const existingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          date: new Date(date)
        }
      });

      if (!existingEntry) {
        throw new AppError('出勤記録が見つかりません', 404);
      }

      // 退勤時刻を更新
      const timeEntry = await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          clockOut: clockOutTime,
          note: note || existingEntry.note,
          status: 'PENDING'
        }
      });

      res.json({
        status: 'success',
        data: { timeEntry },
        message: '退勤打刻が完了しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠記録取得（月次）
router.get('/monthly', 
  authenticate,
  [
    query('year').isInt({ min: 2020, max: 2100 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('userId').optional().isInt().withMessage('有効なユーザーIDを入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { year, month, userId } = req.query;
      const targetUserId = userId || req.user.id;

      // 権限チェック：他のユーザーの勤怠を見る場合は管理者権限が必要
      if (userId && userId != req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('権限がありません', 403);
      }

      // 月の開始日と終了日を計算
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      // 勤怠記録を取得
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId: parseInt(targetUserId),
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      // 有給休暇申請を取得（承認済みのもの）
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: parseInt(targetUserId),
          status: 'APPROVED',
          startDate: {
            lte: endDate
          },
          endDate: {
            gte: startDate
          }
        },
        include: {
          leaveType: true
        }
      });

      // 労働設定を取得
      const workSettings = await getEffectiveWorkSettings(parseInt(targetUserId), startDate, endDate);

      // 勤怠データと有給データをマージ
      const mergedData = [];
      
      // 指定月の全日付を生成
      for (let day = 1; day <= endDate.getDate(); day++) {
        const currentDate = new Date(parseInt(year), parseInt(month) - 1, day);
        
        // 該当日の勤怠記録を検索
        const timeEntry = timeEntries.find(entry => 
          entry.date.getTime() === currentDate.getTime()
        );

        // 該当日の有給休暇を検索
        const leaveRequest = leaveRequests.find(leave => 
          currentDate >= new Date(leave.startDate) && 
          currentDate <= new Date(leave.endDate)
        );

        let entryData = {
          date: currentDate,
          dayOfWeek: currentDate.getDay(),
          isWeekend: isWeekendDay(currentDate),
          clockIn: null,
          clockOut: null,
          workHours: 0,
          breakHours: 0,
          overtimeHours: 0,
          status: 'ABSENT',
          isLate: false,
          note: null,
          workSummary: null,
          achievements: null,
          challenges: null,
          nextDayPlan: null
        };

        if (timeEntry) {
          entryData = {
            ...entryData,
            clockIn: timeEntry.clockIn,
            clockOut: timeEntry.clockOut,
            workHours: timeEntry.workHours || 0,
            breakHours: timeEntry.breakHours || 0,
            overtimeHours: timeEntry.overtimeHours || 0,
            status: timeEntry.status,
            isLate: timeEntry.isLate || false,
            note: timeEntry.note,
            workSummary: timeEntry.workSummary,
            achievements: timeEntry.achievements,
            challenges: timeEntry.challenges,
            nextDayPlan: timeEntry.nextDayPlan
          };
        }

        // 有給休暇の場合はステータスを上書き
        if (leaveRequest) {
          entryData.status = 'PAID_LEAVE';
          entryData.leaveType = leaveRequest.leaveType.name;
          entryData.leaveReason = leaveRequest.reason;
        }

        mergedData.push(entryData);
      }

      res.json({
        status: 'success',
        data: {
          timeEntries: mergedData,
          workSettings: workSettings?.effective || {},
          summary: {
            totalWorkDays: mergedData.filter(d => d.status === 'APPROVED' || d.status === 'PENDING').length,
            totalPaidLeaveDays: mergedData.filter(d => d.status === 'PAID_LEAVE').length,
            totalWorkHours: mergedData.reduce((sum, d) => sum + (d.workHours || 0), 0),
            totalOvertimeHours: mergedData.reduce((sum, d) => sum + (d.overtimeHours || 0), 0)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠記録取得（日次）
router.get('/daily', 
  authenticate,
  [
    query('date').isISO8601().withMessage('有効な日付を入力してください'),
    query('userId').optional().isInt().withMessage('有効なユーザーIDを入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { date, userId } = req.query;
      const targetUserId = userId || req.user.id;

      // 権限チェック
      if (userId && userId != req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('権限がありません', 403);
      }

      const timeEntry = await prisma.timeEntry.findFirst({
        where: {
          userId: parseInt(targetUserId),
          date: new Date(date)
        }
      });

      res.json({
        status: 'success',
        data: { timeEntry }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤怠記録更新（管理者用）
router.put('/:id', 
  authenticate,
  authorize(['ADMIN']),
  [
    body('clockIn').optional().isISO8601().withMessage('有効な出勤時刻を入力してください'),
    body('clockOut').optional().isISO8601().withMessage('有効な退勤時刻を入力してください'),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('有効なステータスを入力してください'),
    body('note').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { id } = req.params;
      const updateData = req.body;

      const timeEntry = await prisma.timeEntry.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      res.json({
        status: 'success',
        data: { timeEntry },
        message: '勤怠記録を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 業務レポート保存
router.post('/work-report',
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('workSummary').optional().isString().withMessage('業務内容サマリーは文字列で入力してください'),
    body('achievements').optional().isString().withMessage('成果・達成事項は文字列で入力してください'),
    body('challenges').optional().isString().withMessage('課題・問題点は文字列で入力してください'),
    body('nextDayPlan').optional().isString().withMessage('翌日の予定・計画は文字列で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('入力データが無効です', 400, errors.array());
      }

      const userId = req.user.id;
      const { date, workSummary, achievements, challenges, nextDayPlan } = req.body;

      // 指定された日付のTimeEntryを検索
      const targetDate = new Date(date);
      const existingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          date: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
          }
        }
      });

      if (existingEntry) {
        // 既存のエントリを更新
        const updatedEntry = await prisma.timeEntry.update({
          where: { id: existingEntry.id },
          data: {
            workSummary,
            achievements,
            challenges,
            nextDayPlan
          }
        });

        res.json({
          status: 'success',
          data: { timeEntry: updatedEntry },
          message: '業務レポートを更新しました'
        });
      } else {
        // 新しいエントリを作成
        const newEntry = await prisma.timeEntry.create({
          data: {
            userId,
            date: targetDate,
            workSummary,
            achievements,
            challenges,
            nextDayPlan,
            status: 'PENDING'
          }
        });

        res.json({
          status: 'success',
          data: { timeEntry: newEntry },
          message: '業務レポートを作成しました'
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
