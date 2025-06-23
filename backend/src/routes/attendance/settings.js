const express = require('express');
const WorkSettingsController = require('../../controllers/attendance/WorkSettingsController');
const { authenticate, authorize } = require('../../middleware/authentication');
const AttendanceValidator = require('../../validators/AttendanceValidator');

const router = express.Router();

// 休憩プリセット関連
router.get('/break-presets',
  authenticate,
  WorkSettingsController.getBreakPresets
);

router.post('/break-presets',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  AttendanceValidator.createBreakPreset,
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
  AttendanceValidator.createWorkSettings,
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
  AttendanceValidator.adminUpdateUserWorkSettings,
  WorkSettingsController.updateUserWorkSettings
);

router.put('/admin/bulk-work-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  AttendanceValidator.adminBulkUpdateWorkSettings,
  WorkSettingsController.bulkUpdateWorkSettings
);

router.get('/admin/company-default-settings',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkSettingsController.getCompanyDefaultSettings
);

module.exports = router;
