const express = require('express');
const { authenticate } = require('../../middleware/authentication');
const ClockController = require('../../controllers/attendance/ClockController');
const AttendanceValidator = require('../../validators/AttendanceValidator');

const router = express.Router();

// 出勤打刻
router.post('/clock-in', 
  authenticate,
  AttendanceValidator.clockIn,
  ClockController.clockIn
);

// 退勤打刻
router.patch('/clock-out/:timeEntryId',
  authenticate,
  AttendanceValidator.clockOut,
  ClockController.clockOut
);

// 休憩開始
router.post('/break-start/:timeEntryId',
  authenticate,
  AttendanceValidator.lateArrival,
  ClockController.startBreak
);

// 休憩終了
router.patch('/break-end/:breakId',
  authenticate,
  ClockController.endBreak
);

module.exports = router;
