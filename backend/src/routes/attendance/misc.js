const express = require('express');
const MiscAttendanceController = require('../../controllers/attendance/MiscAttendanceController');
const { authenticate, authorize } = require('../../middleware/authentication');
const AttendanceValidator = require('../../validators/AttendanceValidator');
const CommonValidationRules = require('../../validators/CommonValidationRules');

const router = express.Router();

// 一括交通費登録
router.post('/bulk-transportation',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  AttendanceValidator.bulkTransportation,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  MiscAttendanceController.bulkTransportation
);

// 勤怠データ更新（一般用 - リクエストボディにIDを含む）
router.post('/update',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  AttendanceValidator.updateAttendanceBody,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);
        // timeEntryIdがある場合はそれを使用、ない場合はdateが必要
      if (!req.body.timeEntryId && !req.body.date) {
        return res.status(400).json({
          status: 'error',
          message: 'timeEntryIDまたはdateが必要です',
          errors: [{ field: 'timeEntryId', message: 'timeEntryIDまたはdateが必要です' }]
        });
      }
      
      // timeEntryIdをreq.paramsに移動してコントローラーで利用
      req.params.timeEntryId = req.body.timeEntryId;
      return MiscAttendanceController.updateAttendance(req, res, next);
    } catch (error) {
      return next(error);
    }
  }
);

// 勤怠データ更新（管理者用 - URLパラメータでID指定）
router.post('/update/:timeEntryId',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  AttendanceValidator.updateAttendanceParam,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  MiscAttendanceController.updateAttendance
);

// テスト用エンドポイント
router.get('/test',
  MiscAttendanceController.getTestData
);

module.exports = router;
