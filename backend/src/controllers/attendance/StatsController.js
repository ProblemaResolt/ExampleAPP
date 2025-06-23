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

  /**
   * 個人ユーザーの統計を取得
   */
  static async getUserStats(req, res, next) {
    try {
      const { userId } = req.params;
      const { year, month } = req.query;

      // 自分のデータのみアクセス可能（管理者以外）
      if (req.user.id !== userId && !['ADMIN', 'COMPANY', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: '他のユーザーの統計データにはアクセスできません'
        });
      }

      const result = await AttendanceStatsService.getUserStats(
        userId,
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

  /**
   * チーム統計を取得
   */
  static async getTeamStats(req, res, next) {
    try {
      const { year, month, projectId } = req.query;
      const managerId = req.user.id;
      const companyId = req.user.companyId;

      const result = await AttendanceStatsService.getTeamStats(
        managerId,
        companyId,
        parseInt(year) || new Date().getFullYear(),
        parseInt(month) || new Date().getMonth() + 1,
        projectId
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
