const ProjectService = require('../services/ProjectService');
const { AppError } = require('../middleware/error');
const CommonValidationRules = require('../validators/CommonValidationRules');

/**
 * プロジェクトコントローラー
 */
class ProjectController {
  /**
   * プロジェクト一覧を取得
   */
  static async getProjects(req, res, next) {
    try {
      const { search, status, managerId, companyId: companyFilter } = req.query;
      const { id: userId, role: userRole, companyId } = req.user;

      const filters = { search, status, managerId, companyFilter };
      const projects = await ProjectService.getProjects(userId, userRole, companyId, filters);

      res.json({
        status: 'success',
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ユーザーの参加プロジェクト一覧を取得
   */
  static async getUserProjects(req, res, next) {
    try {
      const userId = req.user.id;
      const projects = await ProjectService.getUserProjects(userId);

      res.json({
        status: 'success',
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }  /**
   * プロジェクト詳細を取得
   */
  static async getProjectById(req, res, next) {
    try {
      const { id } = req.params;
      const { id: userId, role: userRole, companyId } = req.user;

      const project = await ProjectService.getProjectById(id, userId, userRole, companyId);

      res.json({
        status: 'success',
        data: project
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * プロジェクトを作成
   */
  static async createProject(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { id: userId, role: userRole, companyId } = req.user;
      const project = await ProjectService.createProject(req.body, userId, userRole, companyId);

      res.status(201).json({
        status: 'success',
        data: project,
        message: 'プロジェクトが作成されました'
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * プロジェクトを更新
   */
  static async updateProject(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { id } = req.params;
      const { id: userId, role: userRole, companyId } = req.user;

      const project = await ProjectService.updateProject(id, req.body, userId, userRole, companyId);

      res.json({
        status: 'success',
        data: project,
        message: 'プロジェクトが更新されました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * プロジェクトを削除
   */
  static async deleteProject(req, res, next) {
    try {
      const { id } = req.params;
      const { id: userId, role: userRole, companyId } = req.user;

      const result = await ProjectService.deleteProject(id, userId, userRole, companyId);

      res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }  /**
   * プロジェクトにメンバーを追加
   */  static async addMemberToProject(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { id } = req.params;
      const { userId, allocation = 100, isManager = false } = req.body;

      const result = await ProjectService.addMemberToProject(id, userId, allocation, isManager);

      res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * プロジェクトからメンバーを削除
   */
  static async removeMemberFromProject(req, res, next) {
    try {
      const { id, userId } = req.params;

      const result = await ProjectService.removeMemberFromProject(id, userId);

      res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }  /**
   * プロジェクトメンバーの工数配分を更新
   */  static async updateMemberAllocation(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { id, userId } = req.params;
      const { allocation } = req.body;

      const result = await ProjectService.updateMemberAllocation(id, userId, allocation);

      res.json({
        status: 'success',
        data: result,
        message: '工数配分を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * プロジェクトメンバーの参加期間を更新
   */  static async updateMemberPeriod(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { id, userId } = req.params;
      const { startDate, endDate } = req.body;

      const result = await ProjectService.updateMemberPeriod(id, userId, startDate, endDate);

      res.json({
        status: 'success',
        data: result,
        message: '参加期間を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * プロジェクトメンバーのマネージャー権限を更新
   */
  static async updateMemberManagerStatus(req, res, next) {
    try {
      const { id, userId } = req.params;
      const { isManager } = req.body;

      const result = await ProjectService.updateMemberManagerStatus(id, userId, isManager);

      res.json({
        status: 'success',
        data: result,
        message: 'マネージャー権限を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProjectController;
