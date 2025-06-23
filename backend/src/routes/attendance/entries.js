const express = require('express');
const AttendanceEntryController = require('../../controllers/attendance/AttendanceEntryController');
const { authenticate, authorize } = require('../../middleware/authentication');
const AttendanceValidator = require('../../validators/AttendanceValidator');
const CommonValidationRules = require('../../validators/CommonValidationRules');

const router = express.Router();

// 勤怠記録一覧取得
router.get('/entries',
  authenticate,
  AttendanceValidator.entriesQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  AttendanceEntryController.getEntries
);

// 月次レポート取得
router.get('/monthly-report',
  authenticate,
  AttendanceValidator.monthlyReportQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  AttendanceEntryController.getMonthlyReport
);

// 月別勤怠データ取得
router.get('/monthly/:year/:month',
  authenticate,
  AttendanceValidator.monthlyDataParams,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  AttendanceEntryController.getMonthlyData
);

// Excelエクスポート
router.get('/export/excel',
  authenticate,
  AttendanceValidator.excelExportQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  AttendanceEntryController.exportToExcel
);

module.exports = router;
