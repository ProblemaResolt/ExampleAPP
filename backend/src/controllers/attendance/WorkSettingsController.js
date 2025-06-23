const WorkSettingsService = require('../../services/WorkSettingsService');
const CommonValidationRules = require('../../validators/CommonValidationRules');
const { AppError } = require('../../middleware/error');

/**
 * 勤務設定コントローラー
 */
class WorkSettingsController {
  /**
   * 休憩プリセット一覧を取得
   */
  static async getBreakPresets(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const presets = await WorkSettingsService.getBreakPresets(userId, userRole, companyId);

      res.json({
        status: 'success',
        data: presets
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 休憩プリセットを作成
   */  static async createBreakPreset(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { name, duration, type } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const preset = await WorkSettingsService.createBreakPreset(userId, userRole, companyId, {
        name,
        duration,
        type
      });

      res.status(201).json({
        status: 'success',
        data: preset,
        message: '休憩プリセットを作成しました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 休憩プリセットを削除
   */
  static async deleteBreakPreset(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const result = await WorkSettingsService.deleteBreakPreset(userId, userRole, companyId, id);

      res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ユーザーの勤務設定を取得
   */
  static async getUserWorkSettings(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await WorkSettingsService.getUserWorkSettings(userId);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ユーザーの勤務設定を更新
   */
  static async updateUserWorkSettings(req, res, next) {
    try {      CommonValidationRules.handleValidationErrors(req);

      const { userId: targetUserId } = req.params;
      const settings = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await WorkSettingsService.updateUserWorkSettings(userId, userRole, targetUserId, settings);

      res.json({
        status: 'success',
        data: result,
        message: '勤務設定を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 全ユーザーの勤務設定を取得（管理者用）
   */
  static async getUsersWorkSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const users = await WorkSettingsService.getUsersWorkSettings(userId, userRole, companyId);

      res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 複数ユーザーの勤務設定を一括更新
   */  static async bulkUpdateWorkSettings(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { userIds, settings } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const result = await WorkSettingsService.bulkUpdateWorkSettings(userId, userRole, companyId, {
        userIds,
        settings
      });

      res.json({
        status: 'success',
        data: result,
        message: `${result.updatedCount}件の設定を更新しました`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 会社のデフォルト設定を取得
   */
  static async getCompanyDefaultSettings(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const companyId = req.user.companyId;

      const companies = await WorkSettingsService.getCompanyDefaultSettings(userId, userRole, companyId);

      res.json({
        status: 'success',
        data: companies
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WorkSettingsController;
