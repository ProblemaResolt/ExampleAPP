const express = require('express');
const { body, query } = require('express-validator');
const { authenticate } = require('../../middleware/authentication');
const WorkReportController = require('../../controllers/attendance/WorkReportController');

const router = express.Router();

// 作業報告を作成
router.post('/work-report/:timeEntryId',
  authenticate,
  [
    body('projectId').optional().isUUID(),
    body('description').notEmpty().withMessage('作業内容は必須です'),
    body('workHours').isFloat({ min: 0 }).withMessage('作業時間は0以上の数値である必要があります'),
    body('tasks').optional().isArray()
  ],
  WorkReportController.createWorkReport
);

// 作業報告を更新
router.put('/work-report/:reportId',
  authenticate,
  [
    body('projectId').optional().isUUID(),
    body('description').notEmpty().withMessage('作業内容は必須です'),
    body('workHours').isFloat({ min: 0 }).withMessage('作業時間は0以上の数値である必要があります'),
    body('tasks').optional().isArray()
  ],
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
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('projectId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  WorkReportController.getWorkReports
);

// プロジェクト別統計を取得
router.get('/work-reports/project-stats',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  WorkReportController.getProjectStats
);

// 重複検出
router.get('/work-reports/duplicate-detection',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  WorkReportController.detectDuplicates
);

module.exports = router;
