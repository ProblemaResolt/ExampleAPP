const prisma = require('../lib/prisma');
const ApprovalProcessService = require('./ApprovalProcessService');
const { AppError } = require('../middleware/error');

/**
 * 勤怠記録承認専用サービス
 * ApprovalProcessServiceを継承して勤怠特有の処理を実装
 */
class TimeEntryApprovalService extends ApprovalProcessService {
  /**
   * 承認待ちの勤怠記録を取得（プロジェクト毎にグループ化）
   */
  static async getPendingApprovals(companyId, filters = {}) {
    const { page = 1, limit = 10, status, projectId, userName, startDate, endDate } = filters;
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
        { firstName: { contains: userName, mode: 'insensitive' } },
        { lastName: { contains: userName, mode: 'insensitive' } }
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
          },
          breakEntries: {
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
      prisma.timeEntry.count({ where: whereConditions })
    ]);

    const projectGroups = this.groupEntriesByProject(entries);

    // プロジェクトIDでフィルタリング
    if (projectId) {
      const filteredGroups = projectGroups[projectId] ? { [projectId]: projectGroups[projectId] } : {};
      return {
        projectGroups: filteredGroups,
        totalProjects: Object.keys(filteredGroups).length,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      };
    }

    return {
      projectGroups,
      totalProjects: Object.keys(projectGroups).length,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * エントリーをプロジェクト毎にグループ化
   */
  static groupEntriesByProject(entries) {
    const projectGroups = {};
    
    entries.forEach(entry => {
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
          
          projectGroups[projectId].entries.push({
            ...entry,
            userName: `${entry.user.lastName} ${entry.user.firstName}`,
            currentProject: workReport.project
          });
        });
      } else {
        // プロジェクト未指定
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

    return projectGroups;
  }

  /**
   * 勤怠記録を承認
   */
  static async approveTimeEntry(timeEntryId, approverId) {
    return await this.approveEntity('timeEntry', timeEntryId, approverId);
  }

  /**
   * 勤怠記録を却下
   */
  static async rejectTimeEntry(timeEntryId, approverId, reason) {
    return await this.rejectEntity('timeEntry', timeEntryId, approverId, reason);
  }

  /**
   * 一括承認
   */
  static async bulkApprove(timeEntryIds, approverId) {
    return await this.bulkApproveEntities('timeEntry', timeEntryIds, approverId);
  }

  /**
   * プロジェクトメンバーの月間勤怠を一括承認
   */
  static async bulkApproveMember(memberUserId, approverId, { action, year, month }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const approver = await this.validateApprover(approverId);

    // 対象メンバーの勤怠記録を取得
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: memberUserId,
        status: this.STATUS.PENDING,
        date: { gte: startDate, lte: endDate },
        user: { companyId: approver.companyId }
      }
    });

    if (timeEntries.length === 0) {
      throw new AppError('承認待ちの勤怠記録が見つかりません', 404);
    }

    const result = await prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntries.map(entry => entry.id) }
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
   * 承認対象のプロジェクト一覧を取得
   */
  static async getProjectsWithPendingApprovals(companyId) {
    const projects = await prisma.project.findMany({
      where: {
        companyId: companyId,
        workReports: {
          some: {
            timeEntry: { status: this.STATUS.PENDING }
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
                timeEntry: { status: this.STATUS.PENDING }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // プロジェクト未指定の勤怠記録も含める
    const noProjectCount = await prisma.timeEntry.count({
      where: {
        user: { companyId: companyId },
        status: this.STATUS.PENDING,
        workReports: { none: {} }
      }
    });

    const result = [...projects];
    
    if (noProjectCount > 0) {
      result.unshift({
        id: null,
        name: 'プロジェクト未指定',
        description: 'プロジェクトが指定されていない勤怠記録',
        status: null,
        _count: { workReports: noProjectCount }
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

    const projects = await prisma.project.findMany({
      where: {
        companyId: companyId,
        ...(projectId && { id: projectId })
      },
      include: {
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
    });

    const projectSummaries = await Promise.all(projects.map(async (project) => {
      const memberSummaries = await Promise.all(project.members.map(async (membership) => {
        const timeEntries = await prisma.timeEntry.findMany({
          where: {
            userId: membership.user.id,
            date: { gte: startDate, lte: endDate }
          },
          include: {
            workReports: {
              where: { projectId: project.id }
            }
          }
        });

        const stats = this.calculateMemberStats(timeEntries);

        return {
          user: membership.user,
          role: membership.isManager ? 'MANAGER' : 'MEMBER',
          allocation: membership.allocation || 0,
          stats,
          canExport: stats.pendingCount === 0 && timeEntries.length > 0
        };
      }));

      const projectStats = this.calculateProjectStats(memberSummaries);

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
      summary: this.calculateOverallSummary(projectSummaries)
    };
  }

  /**
   * メンバー統計計算
   */
  static calculateMemberStats(timeEntries) {
    const totalWorkDays = timeEntries.filter(entry => entry.clockIn && entry.clockOut).length;
    const totalWorkHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    const approvalStats = this.calculateApprovalStats(timeEntries);

    return {
      totalWorkDays,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
      ...approvalStats,
      approvedCount: approvalStats.approved,
      pendingCount: approvalStats.pending,
      totalEntries: timeEntries.length
    };
  }

  /**
   * プロジェクト統計計算
   */
  static calculateProjectStats(memberSummaries) {
    return {
      totalMembers: memberSummaries.length,
      totalPendingCount: memberSummaries.reduce((sum, member) => sum + member.stats.pending, 0),
      totalApprovedCount: memberSummaries.reduce((sum, member) => sum + member.stats.approved, 0),
      canExportProject: memberSummaries.every(member => member.canExport)
    };
  }

  /**
   * 全体サマリー計算
   */
  static calculateOverallSummary(projectSummaries) {
    return {
      totalProjects: projectSummaries.length,
      totalMembers: projectSummaries.reduce((sum, proj) => sum + proj.members.length, 0),
      totalPendingCount: projectSummaries.reduce((sum, proj) => sum + proj.projectStats.totalPendingCount, 0)
    };
  }
}

module.exports = TimeEntryApprovalService;
