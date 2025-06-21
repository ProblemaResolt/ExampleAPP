const express = require('express');
const MiscAttendanceController = require('../../controllers/attendance/MiscAttendanceController');
const { authenticate, authorize } = require('../../middleware/authentication');
const { body, param } = require('express-validator');

const router = express.Router();

// 一括交通費登録
router.post('/bulk-transportation',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    body('entries').isArray().withMessage('entries配列が必要です'),
    body('entries.*.userId').isUUID().withMessage('有効なユーザーIDが必要です'),
    body('entries.*.date').isISO8601().withMessage('有効な日付が必要です'),
    body('entries.*.transportation').isFloat({ min: 0 }).withMessage('有効な交通費金額が必要です'),
    body('entries.*.transportationNote').optional().isString()
  ],
  MiscAttendanceController.bulkTransportation
);

// 勤怠データ更新（管理者用）
router.post('/update/:timeEntryId',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    param('timeEntryId').isUUID().withMessage('有効な勤怠記録IDが必要です'),
    body('clockIn').optional().isISO8601(),
    body('clockOut').optional().isISO8601(),
    body('workHours').optional().isFloat({ min: 0 }),
    body('note').optional().isString(),
    body('transportation').optional().isFloat({ min: 0 }),
    body('transportationNote').optional().isString(),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'])
  ],
  MiscAttendanceController.updateAttendance
);

// テスト用エンドポイント
router.get('/test',
  MiscAttendanceController.getTestData
);

module.exports = router;
