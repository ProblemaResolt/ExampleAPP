const MiscAttendanceService = require('../../services/MiscAttendanceService');
const CommonValidationRules = require('../../validators/CommonValidationRules');
const { AppError } = require('../../middleware/error');

/**
 * その他の勤怠機能コントローラー
 */
class MiscAttendanceController {
  /**
   * 一括交通費登録
   */  static async bulkTransportation(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { entries } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const result = await MiscAttendanceService.bulkTransportation(userId, userRole, companyId, {
        entries
      });

      res.json({
        status: 'success',
        data: result,
        message: `${result.successCount}件の交通費を登録しました`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 勤怠データ更新（管理者用）
   */  static async updateAttendance(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { timeEntryId } = req.params;
      const updateData = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const result = await MiscAttendanceService.updateAttendance(
        userId,
        userRole,
        companyId,
        timeEntryId,
        updateData
      );

      res.json({
        status: 'success',
        data: result,
        message: '勤怠データを更新しました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * テスト用エンドポイント
   */
  static async getTestData(req, res, next) {
    try {
      const result = await MiscAttendanceService.getTestData();

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MiscAttendanceController;
