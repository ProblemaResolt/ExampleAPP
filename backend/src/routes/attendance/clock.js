const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authentication');
const ClockController = require('../../controllers/attendance/ClockController');

const router = express.Router();

// 出勤打刻
router.post('/clock-in', 
  authenticate,
  [
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('location').optional().isString(),
    body('note').optional().isString()
  ],
  ClockController.clockIn
);

// 退勤打刻
router.patch('/clock-out/:timeEntryId',
  authenticate,
  [
    body('location').optional().isString(),
    body('note').optional().isString()
  ],
  ClockController.clockOut
);

// 休憩開始
router.post('/break-start/:timeEntryId',
  authenticate,
  [
    body('reason').optional().isString()
  ],
  ClockController.startBreak
);

// 休憩終了
router.patch('/break-end/:breakId',
  authenticate,
  ClockController.endBreak
);

module.exports = router;
