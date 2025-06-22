const TimeEntryApprovalService = require('../../services/TimeEntryApprovalService');
const ApprovalService = require('../../services/ApprovalService'); // PDF/Excelエクスポート用
const { AppError } = require('../../middleware/error');
const ExcelGenerator = require('../../utils/excelGenerator');

/**
 * 勤怠承認コントローラー
 */
class ApprovalController {  /**
   * 承認待ちの勤怠記録を取得（プロジェクト毎にグループ化）
   */
  static async getPendingApprovals(req, res, next) {
    try {
      const { page, limit, status, projectId, userName, startDate, endDate } = req.query;
      const companyId = req.user.companyId;      const result = await TimeEntryApprovalService.getPendingApprovals(companyId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        projectId,
        userName,
        startDate,
        endDate
      });

      res.json({
        status: 'success',
        data: result,
        message: `${result.totalProjects}件のプロジェクトで勤怠記録を取得しました`
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

      const timeEntry = await TimeEntryApprovalService.approveTimeEntry(timeEntryId, approverId);

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

      const timeEntry = await TimeEntryApprovalService.rejectTimeEntry(timeEntryId, approverId, reason);

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

      const result = await TimeEntryApprovalService.bulkApprove(timeEntryIds, approverId);

      res.json({
        status: 'success',
        message: `${result.count}件の勤怠記録を承認しました`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 承認対象のプロジェクト一覧を取得
   */
  static async getProjectsWithPendingApprovals(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const projects = await TimeEntryApprovalService.getProjectsWithPendingApprovals(companyId);

      res.json({
        status: 'success',
        data: projects,
        message: `${projects.length}件のプロジェクトに承認待ちの記録があります`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * プロジェクト毎のメンバー月間サマリーを取得
   */
  static async getProjectMembersSummary(req, res, next) {
    try {
      const { year, month, projectId } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month) {
        throw new AppError('年と月を指定してください', 400);
      }

      const result = await TimeEntryApprovalService.getProjectMembersSummary(companyId, {
        year: parseInt(year),
        month: parseInt(month),
        projectId
      });

      res.json({
        status: 'success',
        data: result,
        message: `${result.period.year}年${result.period.month}月のプロジェクトサマリーを取得しました`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * メンバーの承認待ち勤怠記録を一括処理
   */  static async bulkApproveMember(req, res, next) {
    try {
      const { memberUserId } = req.params;
      const { action, year, month } = req.body;
      const approverId = req.user.id;

      if (!['APPROVED', 'REJECTED'].includes(action)) {
        throw new AppError('無効なアクションです', 400);
      }

      if (!year || !month) {
        throw new AppError('年と月を指定してください', 400);
      }

      const result = await TimeEntryApprovalService.bulkApproveMember(memberUserId, approverId, {
        action,
        year: parseInt(year),
        month: parseInt(month)
      });

      const actionText = action === 'APPROVED' ? '承認' : '却下';
      res.json({
        status: 'success',
        message: `${result.count}件の勤怠記録を${actionText}しました`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * プロジェクト全体の勤怠データをExcelファイルとして出力
   */
  static async exportProjectToExcel(req, res, next) {
    try {
      const { year, month, projectId } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month || !projectId) {
        throw new AppError('年、月、プロジェクトIDを指定してください', 400);
      }

      const result = await ApprovalService.exportProjectToExcel(companyId, {
        year: parseInt(year),
        month: parseInt(month),
        projectId
      });

      // Excelファイル生成
      const workbook = await ExcelGenerator.generateProjectExcel(result);
      
      // レスポンスヘッダー設定
      const fileName = `${result.project.name}_${result.period.year}年${result.period.month}月_勤怠記録.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      // Excelファイルをストリームとして送信
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
  /**
   * 個人の勤怠データをExcelファイルとして出力
   */
  static async exportMemberToExcel(req, res, next) {
    try {
      const { year, month, userId } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month || !userId) {
        throw new AppError('年、月、ユーザーIDを指定してください', 400);
      }

      const result = await ApprovalService.exportMemberToExcel(companyId, {
        year: parseInt(year),
        month: parseInt(month),
        userId
      });

      // Excelファイル生成
      const workbook = await ExcelGenerator.generateMemberExcel(result);
      
      // レスポンスヘッダー設定
      const fileName = `${result.user.firstName}${result.user.lastName}_${result.period.year}年${result.period.month}月_勤怠記録.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      // Excelファイルをストリームとして送信
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * 個人の月間勤怠データを詳細取得
   */
  static async getIndividualAttendance(req, res, next) {
    try {
      const { userId } = req.params;
      const { year, month } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month) {
        throw new AppError('年と月を指定してください', 400);
      }      const result = await ApprovalService.getIndividualAttendance(companyId, {
        userId,
        year: parseInt(year),
        month: parseInt(month)
      });

      res.json({
        status: 'success',
        data: result,
        message: `${result.user.firstName} ${result.user.lastName}の${result.period.year}年${result.period.month}月の勤怠データを取得しました`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 個別の勤怠記録を承認
   */
  static async approveIndividualTimeEntry(req, res, next) {
    try {
      const { timeEntryId } = req.params;

      if (!timeEntryId) {
        throw new AppError('勤怠記録IDを指定してください', 400);
      }

      const result = await ApprovalService.approveIndividualTimeEntry(timeEntryId);

      res.json({
        status: 'success',
        message: '勤怠記録が承認されました',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 個別の勤怠記録を却下
   */
  static async rejectIndividualTimeEntry(req, res, next) {
    try {
      const { timeEntryId } = req.params;
      const { reason } = req.body;

      if (!timeEntryId) {
        throw new AppError('勤怠記録IDを指定してください', 400);
      }

      const result = await ApprovalService.rejectIndividualTimeEntry(timeEntryId, reason);

      res.json({
        status: 'success',
        message: '勤怠記録が却下されました',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * プロジェクトの勤怠データをPDFファイルとして出力
   */
  static async exportProjectToPdf(req, res, next) {
    try {
      const { year, month, projectId } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month || !projectId) {
        throw new AppError('年、月、プロジェクトIDを指定してください', 400);
      }

      const result = await ApprovalService.exportProjectToPdf(companyId, {
        year: parseInt(year),
        month: parseInt(month),
        projectId
      });

      // レスポンスヘッダー設定
      const fileName = `${result.project.name}_${result.period.year}年${result.period.month}月_勤怠記録.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      // PDFをバイナリデータとして送信
      res.send(result.pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 個人の勤怠データをPDFファイルとして出力
   */
  static async exportMemberToPdf(req, res, next) {
    try {
      const { year, month, userId } = req.query;
      const companyId = req.user.companyId;

      if (!year || !month || !userId) {
        throw new AppError('年、月、ユーザーIDを指定してください', 400);
      }

      const result = await ApprovalService.exportMemberToPdf(companyId, {
        year: parseInt(year),
        month: parseInt(month),
        userId
      });

      // レスポンスヘッダー設定
      const fileName = `${result.user.firstName}_${result.user.lastName}_${result.period.year}年${result.period.month}月_勤怠記録.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

      // PDFをバイナリデータとして送信
      res.send(result.pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * メンバーの勤怠記録を一括却下
   */
  static async bulkRejectMember(req, res, next) {
    try {
      const { memberUserId } = req.params;
      const { year, month, reason } = req.body;
      const companyId = req.user.companyId;

      if (!memberUserId) {
        throw new AppError('メンバーのユーザーIDを指定してください', 400);
      }

      if (!year || !month) {
        throw new AppError('年と月を指定してください', 400);
      }

      const result = await ApprovalService.bulkRejectMember(companyId, {
        memberUserId,
        year: parseInt(year),
        month: parseInt(month),
        reason: reason || '一括却下'
      });

      res.json({
        status: 'success',
        message: `${result.updatedCount}件の勤怠記録を却下しました`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApprovalController;
