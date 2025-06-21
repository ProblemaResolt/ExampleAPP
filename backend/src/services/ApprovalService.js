const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');
const PDFGenerator = require('../utils/pdfGenerator');

/**
 * 勤怠承認サービス
 */
class ApprovalService {  /**
   * 承認待ちの勤怠記録を取得（プロジェクト毎にグループ化）
   */
  static async getPendingApprovals(companyId, { page = 1, limit = 10, status, projectId, userName, startDate, endDate }) {
    const skip = (page - 1) * limit;
    
    const whereConditions = {
      user: {
        companyId: companyId
      }
    };

    if (status) {
      whereConditions.status = status;
    }

    if (startDate && endDate) {
      whereConditions.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // ユーザー名での検索
    if (userName) {
      whereConditions.user.OR = [
        {
          firstName: {
            contains: userName,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: userName,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          workReports: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  status: true
                }
              }
            }
          },          breakEntries: {
            select: {
              id: true,
              breakType: true,
              duration: true,
              startTime: true,
              endTime: true
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } }
        ],
        skip,
        take: limit
      }),
      prisma.timeEntry.count({
        where: whereConditions
      })
    ]);

    // プロジェクト毎にグループ化
    const projectGroups = {};
    
    entries.forEach(entry => {
      // プロジェクトが関連付けられている場合
      if (entry.workReports && entry.workReports.length > 0) {
        entry.workReports.forEach(workReport => {
          const projectId = workReport.project.id;
          const projectName = workReport.project.name;
          
          if (!projectGroups[projectId]) {
            projectGroups[projectId] = {
              project: {
                id: projectId,
                name: projectName,
                description: workReport.project.description,
                status: workReport.project.status
              },
              entries: []
            };
          }
          
          // エントリーにプロジェクト情報を含めて追加
          projectGroups[projectId].entries.push({
            ...entry,
            userName: `${entry.user.lastName} ${entry.user.firstName}`,
            currentProject: workReport.project
          });
        });
      } else {
        // プロジェクトが関連付けられていない場合
        const noProjectKey = 'no-project';
        if (!projectGroups[noProjectKey]) {
          projectGroups[noProjectKey] = {
            project: {
              id: null,
              name: 'プロジェクト未指定',
              description: 'プロジェクトが指定されていない勤怠記録',
              status: null
            },
            entries: []
          };
        }
        
        projectGroups[noProjectKey].entries.push({
          ...entry,
          userName: `${entry.user.lastName} ${entry.user.firstName}`,
          currentProject: null
        });
      }
    });

    // プロジェクトIDでフィルタリング
    if (projectId) {
      const filteredGroups = {};
      if (projectGroups[projectId]) {
        filteredGroups[projectId] = projectGroups[projectId];
      }
      return {
        projectGroups: filteredGroups,
        totalProjects: Object.keys(filteredGroups).length,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    return {
      projectGroups,
      totalProjects: Object.keys(projectGroups).length,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 勤怠記録を承認
   */
  static async approveTimeEntry(timeEntryId, approverId) {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    // 承認者が同じ会社に所属しているかチェック
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || approver.companyId !== timeEntry.user.companyId) {
      throw new AppError('承認権限がありません', 403);
    }

    if (!['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    if (timeEntry.status === 'APPROVED') {
      throw new AppError('既に承認済みです', 400);
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date()
      },
      include: {
        user: {
          select: {
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
   * 勤怠記録を却下
   */
  static async rejectTimeEntry(timeEntryId, approverId, reason) {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    // 承認者が同じ会社に所属しているかチェック
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || approver.companyId !== timeEntry.user.companyId) {
      throw new AppError('承認権限がありません', 403);
    }

    if (!['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    if (timeEntry.status === 'REJECTED') {
      throw new AppError('既に却下済みです', 400);
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        status: 'REJECTED',
        rejectedBy: approverId,
        rejectedAt: new Date(),
        rejectionReason: reason
      },
      include: {
        user: {
          select: {
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
   * 一括承認
   */  static async bulkApprove(timeEntryIds, approverId) {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || !['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    // 対象の勤怠記録が全て同じ会社に所属しているかチェック
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
        user: {
          companyId: approver.companyId
        }
      }
    });

    if (timeEntries.length !== timeEntryIds.length) {
      throw new AppError('承認対象に無効な記録が含まれています', 400);
    }

    const updatedTimeEntries = await prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
        status: 'PENDING'
      },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date()
      }
    });

    return updatedTimeEntries;
  }

  /**
   * 承認対象のプロジェクト一覧を取得
   */
  static async getProjectsWithPendingApprovals(companyId) {
    const projects = await prisma.project.findMany({
      where: {
        companyId: companyId,
        workReports: {
          some: {
            timeEntry: {
              status: 'PENDING'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        _count: {
          select: {
            workReports: {
              where: {
                timeEntry: {
                  status: 'PENDING'
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // プロジェクト未指定の勤怠記録も含める
    const noProjectCount = await prisma.timeEntry.count({
      where: {
        user: {
          companyId: companyId
        },
        status: 'PENDING',
        workReports: {
          none: {}
        }
      }
    });

    const result = [...projects];
    
    if (noProjectCount > 0) {
      result.unshift({
        id: null,
        name: 'プロジェクト未指定',
        description: 'プロジェクトが指定されていない勤怠記録',
        status: null,
        _count: {
          workReports: noProjectCount
        }
      });
    }

    return result;
  }

  /**
   * プロジェクト毎のメンバー月間サマリーを取得
   */
  static async getProjectMembersSummary(companyId, { year, month, projectId }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // プロジェクトメンバーシップから全メンバーを取得
    const projects = await prisma.project.findMany({
      where: {
        companyId: companyId,
        ...(projectId && { id: projectId })
      },      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });    const projectSummaries = await Promise.all(projects.map(async (project) => {
      const memberSummaries = await Promise.all(project.members.map(async (membership) => {
        const userId = membership.user.id;
        
        // メンバーの月間勤怠データを取得
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
              where: {
                projectId: project.id
              }
            }
          }
        });

        // 統計計算
        const totalWorkDays = timeEntries.filter(entry => entry.clockIn && entry.clockOut).length;
        const totalWorkHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
        const pendingCount = timeEntries.filter(entry => entry.status === 'PENDING').length;
        const approvedCount = timeEntries.filter(entry => entry.status === 'APPROVED').length;
        const rejectedCount = timeEntries.filter(entry => entry.status === 'REJECTED').length;

        return {
          user: membership.user,
          role: membership.isManager ? 'MANAGER' : 'MEMBER',
          allocation: membership.allocation || 0,
          stats: {
            totalWorkDays,
            totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
            pendingCount,
            approvedCount,
            rejectedCount,
            totalEntries: timeEntries.length,
            approvalRate: timeEntries.length > 0 ? ((approvedCount / timeEntries.length) * 100).toFixed(1) : 0
          },
          canExport: pendingCount === 0 && timeEntries.length > 0
        };
      }));

      // プロジェクト全体の統計
      const projectStats = {
        totalMembers: memberSummaries.length,
        totalPendingCount: memberSummaries.reduce((sum, member) => sum + member.stats.pendingCount, 0),
        totalApprovedCount: memberSummaries.reduce((sum, member) => sum + member.stats.approvedCount, 0),
        canExportProject: memberSummaries.every(member => member.canExport)
      };

      return {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status
        },
        members: memberSummaries,
        projectStats
      };
    }));

    return {
      period: { year: parseInt(year), month: parseInt(month) },
      projects: projectSummaries,
      summary: {
        totalProjects: projectSummaries.length,
        totalMembers: projectSummaries.reduce((sum, proj) => sum + proj.members.length, 0),
        totalPendingCount: projectSummaries.reduce((sum, proj) => sum + proj.projectStats.totalPendingCount, 0)
      }
    };
  }

  /**
   * メンバーの承認待ち勤怠記録を一括処理
   */
  static async bulkApproveMember(memberUserId, approverId, { action, year, month }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);    // 承認者の会社情報を取得
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver?.companyId) {
      throw new AppError('承認者の会社情報が見つかりません', 404);
    }

    // 対象メンバーの勤怠記録を取得（同じ会社のメンバーのみ）
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: memberUserId,
        status: 'PENDING',
        date: {
          gte: startDate,
          lte: endDate
        },
        user: {
          companyId: approver.companyId
        }
      }
    });

    if (timeEntries.length === 0) {
      throw new AppError('承認待ちの勤怠記録が見つかりません', 404);
    }    // 一括更新
    const result = await prisma.timeEntry.updateMany({
      where: {
        id: {
          in: timeEntries.map(entry => entry.id)
        }
      },
      data: {
        status: action,
        approvedBy: approverId,
        approvedAt: new Date()
      }
    });

    return {
      count: result.count,
      action,
      memberUserId,
      period: { year, month }
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

  /**
   * プロジェクト全体の勤怠データをExcelファイルとして出力
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
    });    return {
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const members = await this.getProjectMembersSummary(companyId, { year, month, projectId });

    // PDF生成
    const pdfBuffer = await PDFGenerator.generateProjectPDF({
      project: project,
      period: { year, month },
      members: members.members
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
}

module.exports = ApprovalService;
