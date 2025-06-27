const express = require('express');

const clockRoutes = require('./clock');
const settingsRoutes = require('./settings');
const approvalRoutes = require('./approval');
const statsRoutes = require('./stats');
const entriesRoutes = require('./entries');
const workReportRoutes = require('./workReport');
const miscRoutes = require('./misc');

const router = express.Router();

// 各勤怠関連ルートをマウント
router.use('/', clockRoutes);
router.use('/settings', settingsRoutes);
router.use('/approval', approvalRoutes);
router.use('/stats', statsRoutes);
router.use('/', entriesRoutes);
router.use('/', workReportRoutes);
router.use('/misc', miscRoutes);

module.exports = router;
