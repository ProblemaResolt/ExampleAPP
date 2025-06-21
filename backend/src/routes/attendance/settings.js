const express = require('express');
const WorkSettingsController = require('../../controllers/attendance/WorkSettingsController');
const { authenticate, authorize } = require('../../middleware/authentication');
const { body, param } = require('express-validator');

const router = express.Router();

// 休憩プリセット関連
router.get('/break-presets',
  authenticate,
  WorkSettingsController.getBreakPresets
);

router.post('/break-presets',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    body('name').notEmpty().withMessage('プリセット名は必須です'),
    body('duration').isInt({ min: 1 }).withMessage('有効な時間を入力してください'),
    body('type').optional().isIn(['BREAK', 'LUNCH']).withMessage('有効なタイプを選択してください')
  ],
  WorkSettingsController.createBreakPreset
);

router.delete('/break-presets/:id',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkSettingsController.deleteBreakPreset
);

// 勤務設定関連
router.get('/work-settings',
  authenticate,
  WorkSettingsController.getUserWorkSettings
);

router.post('/work-settings',
  authenticate,
  [
    body('workStartTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な開始時刻を入力してください'),
    body('workEndTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な終了時刻を入力してください'),
    body('breakDuration').optional().isInt({ min: 0 }).withMessage('有効な休憩時間を入力してください'),
    body('flexTime').optional().isBoolean(),
    body('overtime').optional().isBoolean()
  ],
  async (req, res, next) => {
    // 自分自身の設定更新として処理
    req.params.userId = req.user.id;
    WorkSettingsController.updateUserWorkSettings(req, res, next);
  }
);

// 管理者向け設定管理
router.get('/admin/users-work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkSettingsController.getUsersWorkSettings
);

router.put('/admin/user-work-settings/:userId',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    param('userId').isUUID(),
    body('workStartTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な開始時刻を入力してください'),
    body('workEndTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な終了時刻を入力してください'),
    body('breakDuration').optional().isInt({ min: 0 }).withMessage('有効な休憩時間を入力してください'),
    body('flexTime').optional().isBoolean(),
    body('overtime').optional().isBoolean()
  ],
  WorkSettingsController.updateUserWorkSettings
);

router.put('/admin/bulk-work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    body('userIds').isArray().withMessage('ユーザーIDの配列が必要です'),
    body('userIds.*').isUUID().withMessage('有効なユーザーIDが必要です'),
    body('settings.workStartTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な開始時刻を入力してください'),
    body('settings.workEndTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('有効な終了時刻を入力してください'),
    body('settings.breakDuration').optional().isInt({ min: 0 }).withMessage('有効な休憩時間を入力してください'),
    body('settings.flexTime').optional().isBoolean(),
    body('settings.overtime').optional().isBoolean()
  ],
  WorkSettingsController.bulkUpdateWorkSettings
);

router.get('/admin/company-default-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkSettingsController.getCompanyDefaultSettings
);

module.exports = router;
