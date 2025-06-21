const express = require('express');

// 分割されたルートファイルをインポート
const clockRoutes = require('./attendance/clock');
const approvalRoutes = require('./attendance/approval');
const workReportRoutes = require('./attendance/workReport');
const statsRoutes = require('./attendance/stats');
const entriesRoutes = require('./attendance/entries');
const settingsRoutes = require('./attendance/settings');
const miscRoutes = require('./attendance/misc');

const router = express.Router();

// 各機能のルートを統合
router.use('/', clockRoutes);        // 打刻機能
router.use('/', approvalRoutes);     // 承認機能
router.use('/', workReportRoutes);   // 作業報告機能
router.use('/', statsRoutes);        // 統計機能
router.use('/', entriesRoutes);      // 勤怠記録管理
router.use('/', settingsRoutes);     // 設定管理
router.use('/', miscRoutes);         // その他機能

module.exports = router;
