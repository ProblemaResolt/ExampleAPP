const express = require('express');
const AttendanceEntryController = require('../../controllers/attendance/AttendanceEntryController');
const { authenticate, authorize } = require('../../middleware/authentication');
const { query, param } = require('express-validator');

const router = express.Router();

// 勤怠記録一覧取得
router.get('/entries',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT']),
    query('userId').optional().isUUID()
  ],
  AttendanceEntryController.getEntries
);

// 月次レポート取得
router.get('/monthly-report',
  authenticate,
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('userId').optional().isUUID()
  ],
  AttendanceEntryController.getMonthlyReport
);

// 月別勤怠データ取得
router.get('/monthly/:year/:month',
  authenticate,
  [
    param('year').isInt({ min: 2000, max: 3000 }),
    param('month').isInt({ min: 1, max: 12 })
  ],
  AttendanceEntryController.getMonthlyData
);

module.exports = router;
