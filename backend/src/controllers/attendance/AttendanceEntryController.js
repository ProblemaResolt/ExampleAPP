const AttendanceEntryService = require('../../services/AttendanceEntryService');
const { validationResult } = require('express-validator');
const { AppError } = require('../../middleware/error');

/**
 * 勤怠エントリコントローラー
 */
class AttendanceEntryController {
  /**
   * 勤怠記録一覧を取得
   */
  static async getEntries(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { page, limit, startDate, endDate, status, userId: userFilter } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await AttendanceEntryService.getEntries(userId, userRole, {
        page,
        limit,
        startDate,
        endDate,
        status,
        userFilter
      });

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 月次レポートを取得
   */
  static async getMonthlyReport(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { year, month, userId: userFilter } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await AttendanceEntryService.getMonthlyReport(userId, userRole, {
        year: parseInt(year),
        month: parseInt(month),
        userFilter
      });

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 月別勤怠データを取得
   */
  static async getMonthlyData(req, res, next) {
    try {
      const { year, month } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await AttendanceEntryService.getMonthlyData(
        userId,
        userRole,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AttendanceEntryController;
