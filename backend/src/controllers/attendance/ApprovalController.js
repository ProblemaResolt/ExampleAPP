const ApprovalService = require('../../services/ApprovalService');
const { AppError } = require('../../middleware/error');

/**
 * 勤怠承認コントローラー
 */
class ApprovalController {
  /**
   * 承認待ちの勤怠記録を取得
   */
  static async getPendingApprovals(req, res, next) {
    try {
      const { page, limit, status, userId, startDate, endDate } = req.query;
      const companyId = req.user.companyId;

      const result = await ApprovalService.getPendingApprovals(companyId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        userId,
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
   * 勤怠記録を承認
   */
  static async approveTimeEntry(req, res, next) {
    try {
      const { timeEntryId } = req.params;
      const approverId = req.user.id;

      const timeEntry = await ApprovalService.approveTimeEntry(timeEntryId, approverId);

      res.json({
        status: 'success',
        message: '勤怠記録を承認しました',
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 勤怠記録を却下
   */
  static async rejectTimeEntry(req, res, next) {
    try {
      const { timeEntryId } = req.params;
      const { reason } = req.body;
      const approverId = req.user.id;

      const timeEntry = await ApprovalService.rejectTimeEntry(timeEntryId, approverId, reason);

      res.json({
        status: 'success',
        message: '勤怠記録を却下しました',
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 一括承認
   */
  static async bulkApprove(req, res, next) {
    try {
      const { timeEntryIds } = req.body;
      const approverId = req.user.id;

      if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
        throw new AppError('承認対象のIDが指定されていません', 400);
      }

      const result = await ApprovalService.bulkApprove(timeEntryIds, approverId);

      res.json({
        status: 'success',
        message: `${result.count}件の勤怠記録を承認しました`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApprovalController;
