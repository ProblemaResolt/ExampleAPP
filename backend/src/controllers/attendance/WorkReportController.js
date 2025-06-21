const { validationResult } = require('express-validator');
const WorkReportService = require('../../services/WorkReportService');
const { AppError } = require('../../middleware/error');

/**
 * 作業報告コントローラー
 */
class WorkReportController {
  /**
   * 作業報告を作成
   */
  static async createWorkReport(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { timeEntryId } = req.params;
      const userId = req.user.id;
      const reportData = req.body;

      const workReport = await WorkReportService.createWorkReport(timeEntryId, userId, reportData);

      res.status(201).json({
        status: 'success',
        message: '作業報告を作成しました',
        data: workReport
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 作業報告を更新
   */
  static async updateWorkReport(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { reportId } = req.params;
      const userId = req.user.id;
      const reportData = req.body;

      const workReport = await WorkReportService.updateWorkReport(reportId, userId, reportData);

      res.json({
        status: 'success',
        message: '作業報告を更新しました',
        data: workReport
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 作業報告を削除
   */
  static async deleteWorkReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      const result = await WorkReportService.deleteWorkReport(reportId, userId);

      res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 作業報告一覧を取得
   */
  static async getWorkReports(req, res, next) {
    try {
      const { page, limit, projectId, startDate, endDate } = req.query;
      const userId = req.user.id;

      const result = await WorkReportService.getWorkReports(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        projectId,
        startDate,
        endDate
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
   * プロジェクト別統計を取得
   */
  static async getProjectStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      const stats = await WorkReportService.getProjectStats(userId, { startDate, endDate });

      res.json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重複検出
   */
  static async detectDuplicates(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      const duplicates = await WorkReportService.detectDuplicates(userId, { startDate, endDate });

      res.json({
        status: 'success',
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WorkReportController;
