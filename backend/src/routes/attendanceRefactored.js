const express = require('express');

// 分割されたルートファイルをインポート
const clockRoutes = require('./attendance/clock');
const approvalRoutes = require('./attendance/approval');
const workReportRoutes = require('./attendance/workReport');
const statsRoutes = require('./attendance/stats');

// 既存の機能（まだ分割していない部分）
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body, query } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();

// 分割されたルートを統合
router.use('/', clockRoutes);
router.use('/', approvalRoutes);
router.use('/', workReportRoutes);
router.use('/', statsRoutes);

// まだ分割していない既存のエンドポイント（段階的に移行）

// 勤怠記録一覧取得
router.get('/entries',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { page = 1, limit = 10, startDate, endDate, status } = req.query;
      const userId = req.user.id;
      const skip = (page - 1) * limit;

      const whereConditions = { userId };

      if (startDate && endDate) {
        whereConditions.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      if (status) {
        whereConditions.status = status;
      }

      const [entries, total] = await Promise.all([
        prisma.timeEntry.findMany({
          where: whereConditions,
          include: {
            workReports: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          skip: parseInt(skip),
          take: parseInt(limit)
        }),
        prisma.timeEntry.count({
          where: whereConditions
        })
      ]);

      res.json({
        status: 'success',
        data: {
          entries,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 月次レポート（詳細版）
router.get('/monthly-report',
  authenticate,
  [
    query('year').isInt({ min: 2020, max: 2030 }).withMessage('有効な年を指定してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を指定してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { year, month } = req.query;
      const userId = req.user.id;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          workReports: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      // 統計計算
      const totalWorkingHours = timeEntries.reduce((sum, entry) => {
        return sum + (entry.workingHours || 0);
      }, 0);

      const attendedDays = timeEntries.filter(entry => entry.clockIn).length;
      const approvedDays = timeEntries.filter(entry => entry.status === 'APPROVED').length;
      const pendingDays = timeEntries.filter(entry => entry.status === 'PENDING').length;

      // 営業日計算（土日除く）
      const totalDays = endDate.getDate();
      let workingDays = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }

      const averageWorkingHours = attendedDays > 0 ? totalWorkingHours / attendedDays : 0;

      const monthlyReport = {
        year: parseInt(year),
        month: parseInt(month),
        summary: {
          totalDays,
          workingDays,
          attendedDays,
          totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
          averageWorkingHours: parseFloat(averageWorkingHours.toFixed(2)),
          approvedDays,
          pendingDays,
          attendanceRate: workingDays > 0 ? ((attendedDays / workingDays) * 100).toFixed(1) : 0
        },
        entries: timeEntries
      };

      res.json({
        status: 'success',
        data: monthlyReport
      });
    } catch (error) {
      next(error);
    }
  }
);

// テスト用エンドポイント
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Attendance API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
