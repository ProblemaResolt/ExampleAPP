const express = require('express');
const { authenticate, authorize } = require('../../middleware/authentication');
const StatsController = require('../../controllers/attendance/StatsController');
const AttendanceValidator = require('../../validators/AttendanceValidator');
const CommonValidationRules = require('../../validators/CommonValidationRules');

const router = express.Router();

// 月次勤怠統計を取得
router.get('/monthly/:year/:month',
  authenticate,
  StatsController.getMonthlyStats
);

// 会社全体の統計を取得
router.get('/company-stats',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.statsQueryWithYear,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  StatsController.getCompanyStats
);

// 個人ユーザーの統計を取得
router.get('/user-stats/:userId',
  authenticate,
  AttendanceValidator.statsQueryWithYear,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  StatsController.getUserStats
);

// チーム統計を取得（Manager/Company用）
router.get('/team-stats',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.teamStatsQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  StatsController.getTeamStats
);

module.exports = router;
