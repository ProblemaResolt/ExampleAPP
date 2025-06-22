const AttendanceEntryService = require('../../services/AttendanceEntryService');
const CommonValidationRules = require('../../validators/CommonValidationRules');
const { AppError } = require('../../middleware/error');

/**
 * 勤怠エントリコントローラー
 */
class AttendanceEntryController {
  /**
   * 勤怠記録一覧を取得
   */  static async getEntries(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

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
   */  static async getMonthlyReport(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

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

  /**
   * 勤怠記録をExcel形式でエクスポート
   */  static async exportToExcel(req, res, next) {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { year, month, userId: userFilter, format } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;      // ロール別のアクセス権限チェック
      if (userRole === 'MEMBER' && userFilter && userFilter !== userId) {
        throw new AppError('他のユーザーのデータをエクスポートする権限がありません', 403);
      } else if ((userRole === 'COMPANY' || userRole === 'MANAGER') && userFilter) {
        // COMPANYまたはMANAGERは同じ会社のメンバーのみエクスポート可能
        const prisma = require('../../lib/prisma');
        const [currentUser, targetUser] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
          prisma.user.findUnique({ where: { id: userFilter }, select: { companyId: true } })
        ]);
        
        if (!currentUser?.companyId || currentUser.companyId !== targetUser?.companyId) {
          throw new AppError('同じ会社のメンバーのデータのみエクスポートできます', 403);
        }
      }

      const result = await AttendanceEntryService.exportToExcel(userId, userRole, {
        year: parseInt(year),
        month: parseInt(month),
        userFilter,
        format
      });

      // Excelファイルとしてレスポンスを設定
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
      res.setHeader('Content-Length', result.buffer.length);
      
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AttendanceEntryController;
