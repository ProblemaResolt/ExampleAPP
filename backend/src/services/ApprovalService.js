const prisma = require('../lib/prisma');
const TimeEntryApprovalService = require('./TimeEntryApprovalService');
const PDFGenerator = require('../utils/pdfGenerator');
const { AppError } = require('../middleware/error');

/**
 * 勤怠承認サービス（エクスポート機能専用）
 * 承認ロジックはTimeEntryApprovalServiceに移行
 */
class ApprovalService {
  /**
   * プロジェクトの勤怠データをExcelファイルとして出力
   */
  static async exportProjectToExcel(companyId, { year, month, projectId }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: companyId
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      throw new AppError('プロジェクトが見つかりません', 404);
    }

    // 全メンバーの勤怠データを取得
    const memberData = await Promise.all(project.members.map(async (membership) => {
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          userId: membership.user.id,
          date: {
            gte: startDate,
            lte: endDate
          },
          status: 'APPROVED' // 承認済みのデータのみ
        },
        include: {
          workReports: {
            where: {
              projectId: project.id
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      return {
        user: membership.user,
        timeEntries
      };
    }));

    return {
      project,
      period: { year: parseInt(year), month: parseInt(month) },
      memberData
    };
  }

  /**
   * 個人の勤怠データをExcelファイルとして出力
   */
  static async exportMemberToExcel(companyId, { year, month, userId }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId
      }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'APPROVED' // 承認済みのデータのみ
      },
      include: {
        workReports: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return {
      user,
      period: { year: parseInt(year), month: parseInt(month) },
      timeEntries
    };
  }

  /**
   * 個人の月間勤怠データを詳細取得
   */
  static async getIndividualAttendance(companyId, { userId, year, month }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // ユーザー情報を取得
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // 月間勤怠データを取得
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        workReports: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return {
      user,
      period: { year: parseInt(year), month: parseInt(month) },
      timeEntries,
      summary: {
        totalDays: timeEntries.length,
        totalWorkHours: timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0),
        approvedCount: timeEntries.filter(entry => entry.status === 'APPROVED').length,
        pendingCount: timeEntries.filter(entry => entry.status === 'PENDING').length,
        rejectedCount: timeEntries.filter(entry => entry.status === 'REJECTED').length
      }
    };
  }

  /**
   * 個別の勤怠記録を承認
   */
  static async approveIndividualTimeEntry(timeEntryId) {
    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: { 
        status: 'APPROVED',
        approvedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updatedTimeEntry;
  }

  /**
   * 個別の勤怠記録を却下
   */
  static async rejectIndividualTimeEntry(timeEntryId, reason = null) {
    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: { 
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updatedTimeEntry;
  }

  /**
   * プロジェクトの勤怠データをPDF出力用データとして取得
   */
  static async exportProjectToPdf(companyId, { year, month, projectId }) {
    // プロジェクトの存在確認
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: companyId
      }
    });

    if (!project) {
      throw new AppError('指定されたプロジェクトが見つかりません', 404);
    }

    // プロジェクトメンバーと勤怠データを取得
    const members = await TimeEntryApprovalService.getProjectMembersSummary(companyId, { year, month, projectId });

    // PDF生成
    const pdfBuffer = await PDFGenerator.generateProjectPDF({
      project: project,
      period: { year, month },
      members: members.projects[0]?.members || []
    });

    return {
      project: project,
      period: { year, month },
      pdfBuffer: pdfBuffer
    };
  }

  /**
   * 個人の勤怠データをPDF出力用データとして取得
   */
  static async exportMemberToPdf(companyId, { year, month, userId }) {
    // ユーザーの存在確認
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId
      }
    });

    if (!user) {
      throw new AppError('指定されたユーザーが見つかりません', 404);
    }

    // 個人の勤怠データを取得
    const attendanceData = await this.getIndividualAttendance(companyId, { year, month, userId });

    // PDF生成
    const pdfBuffer = await PDFGenerator.generateMemberPDF({
      user: user,
      period: { year, month },
      timeEntries: attendanceData.timeEntries
    });

    return {
      user: user,
      period: { year, month },
      pdfBuffer: pdfBuffer
    };
  }

  /**
   * メンバーの承認待ち勤怠記録を一括却下
   */
  static async bulkRejectMember(companyId, { memberUserId, year, month, reason }) {
    // ユーザーの存在確認
    const user = await prisma.user.findFirst({
      where: {
        id: memberUserId,
        companyId: companyId
      }
    });

    if (!user) {
      throw new AppError('指定されたユーザーが見つかりません', 404);
    }

    // 指定期間の承認待ち勤怠記録を取得
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await prisma.timeEntry.updateMany({
      where: {
        userId: memberUserId,
        status: 'PENDING',
        date: {
          gte: startDate,
          lte: endDate
        },
        user: {
          companyId: companyId
        }
      },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    });

    return {
      updatedCount: result.count,
      user: user,
      period: { year, month }
    };
  }
}

module.exports = ApprovalService;
