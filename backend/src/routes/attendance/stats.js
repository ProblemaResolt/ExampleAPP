const express = require('express');
const { query } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/authentication');
const StatsController = require('../../controllers/attendance/StatsController');

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
  [
    query('year').optional().isInt({ min: 2020, max: 2030 }),
    query('month').optional().isInt({ min: 1, max: 12 })
  ],
  StatsController.getCompanyStats
);

module.exports = router;
