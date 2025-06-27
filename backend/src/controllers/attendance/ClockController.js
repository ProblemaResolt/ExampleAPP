const ClockService = require('../../services/ClockService');
const CommonValidationRules = require('../../validators/CommonValidationRules');

/**
 * 時刻打刻コントローラー
 */
class ClockController {  /**
   * 出勤打刻
   */
  static async clockIn(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { date, location, note } = req.body;
      const userId = req.user.id;

      const timeEntry = await ClockService.clockIn(userId, { date, location, note });

      res.json({
        status: 'success',
        message: '出勤打刻が完了しました',
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * 退勤打刻
   */
  static async clockOut(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { timeEntryId } = req.params;
      const { location, note } = req.body;
      const userId = req.user.id;

      const timeEntry = await ClockService.clockOut(timeEntryId, userId, { location, note });

      res.json({
        status: 'success',
        message: '退勤打刻が完了しました',
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * 休憩開始
   */
  static async startBreak(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { timeEntryId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const breakRecord = await ClockService.startBreak(timeEntryId, userId, { reason });

      res.json({
        status: 'success',
        message: '休憩を開始しました',
        data: breakRecord
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 休憩終了
   */
  static async endBreak(req, res, next) {
    try {
      const { breakId } = req.params;
      const userId = req.user.id;

      const breakRecord = await ClockService.endBreak(breakId, userId);

      res.json({
        status: 'success',
        message: '休憩を終了しました',
        data: breakRecord
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClockController;
