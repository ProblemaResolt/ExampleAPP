const AttendanceStatsService = require('../../services/AttendanceStatsService');

/**
 * 勤怠統計コントローラー
 */
class StatsController {
  /**
   * 月次勤怠統計を取得
   */
  static async getMonthlyStats(req, res, next) {
    try {
      const { year, month } = req.params;
      const userId = req.user.id;

      const result = await AttendanceStatsService.getMonthlyStats(
        userId,
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

  /**
   * 会社全体の統計を取得
   */
  static async getCompanyStats(req, res, next) {
    try {
      const { year, month } = req.query;
      const companyId = req.user.companyId;

      const result = await AttendanceStatsService.getCompanyStats(
        companyId,
        parseInt(year) || new Date().getFullYear(),
        parseInt(month) || new Date().getMonth() + 1
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

module.exports = StatsController;
