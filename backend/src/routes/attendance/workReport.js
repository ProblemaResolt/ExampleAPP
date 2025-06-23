const express = require('express');
const { authenticate } = require('../../middleware/authentication');
const WorkReportController = require('../../controllers/attendance/WorkReportController');
const AttendanceValidator = require('../../validators/AttendanceValidator');
const CommonValidationRules = require('../../validators/CommonValidationRules');

const router = express.Router();

// 作業報告を作成
router.post('/work-report/:timeEntryId',
  authenticate,
  AttendanceValidator.createWorkReport,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  WorkReportController.createWorkReport
);

// 作業報告を更新
router.put('/work-report/:reportId',
  authenticate,
  AttendanceValidator.updateWorkReport,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  WorkReportController.updateWorkReport
);

// 作業報告を削除
router.delete('/work-report/:reportId',
  authenticate,
  WorkReportController.deleteWorkReport
);

// 作業報告一覧を取得
router.get('/work-reports',
  authenticate,
  AttendanceValidator.workReportsQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  WorkReportController.getWorkReports
);

// プロジェクト別統計を取得
router.get('/work-reports/project-stats',
  authenticate,
  AttendanceValidator.projectStatsQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  WorkReportController.getProjectStats
);

// 重複検出
router.get('/work-reports/duplicate-detection',
  authenticate,
  AttendanceValidator.duplicateDetectionQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  WorkReportController.detectDuplicates
);

module.exports = router;
