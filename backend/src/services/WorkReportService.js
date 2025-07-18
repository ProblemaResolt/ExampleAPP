const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 作業報告サービス
 */
class WorkReportService {
  /**
   * 作業報告を作成
   */
  static async createWorkReport(timeEntryId, userId, reportData) {
    const { projectId, description, duration, title } = reportData;

    return await prisma.$transaction(async (tx) => {
      // timeEntryが存在し、ユーザーが所有者であることを確認
      const timeEntry = await tx.timeEntry.findFirst({
        where: { id: timeEntryId, userId }
      });
      if (!timeEntry) throw new AppError('勤怠記録が見つかりません', 404);

      // 厳密に重複チェック
      const existing = await tx.workReport.findFirst({ where: { timeEntryId } });
      if (existing) throw new AppError('この勤怠レコードには既に業務レポートが登録されています', 409);

      // プロジェクトの存在確認とメンバーシップチェック
      if (projectId) {
        const projectMembership = await tx.projectMembership.findFirst({
          where: { projectId, userId }
        });
        if (!projectMembership) throw new AppError('指定されたプロジェクトのメンバーではありません', 403);
      }

      // 登録
      return await tx.workReport.create({
        data: {
          timeEntryId,
          projectId,
          description,
          duration: typeof duration === 'number' ? duration : 0,
          title: title || ''
        },
        include: {
          project: { select: { id: true, name: true } },
          timeEntry: { select: { date: true } }
        }
      });
    });
  }

  /**
   * 作業報告を更新
   */
  static async updateWorkReport(reportId, userId, reportData) {
    const { projectId, description, workHours } = reportData;

    const workReport = await prisma.workReport.findFirst({
      where: {
        id: reportId,
        timeEntry: {
          userId
        }
      },
      include: {
        timeEntry: true
      }
    });

    if (!workReport) {
      throw new AppError('作業報告が見つかりません', 404);
    }

    // プロジェクトの存在確認とメンバーシップチェック
    if (projectId) {
      const projectMembership = await prisma.projectMembership.findFirst({
        where: {
          projectId,
          userId
        }
      });

      if (!projectMembership) {
        throw new AppError('指定されたプロジェクトのメンバーではありません', 403);
      }
    }

    // 不要なフィールドを除外し、durationのみセット
    const updateData = {
      projectId,
      description
    };
    if (workHours !== undefined && workHours !== null && workHours !== "") {
      updateData.duration = parseFloat(workHours);
    }

    const updatedWorkReport = await prisma.workReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        timeEntry: {
          select: {
            date: true
          }
        }
      }
    });

    return updatedWorkReport;
  }

  /**
   * 作業報告を削除
   */
  static async deleteWorkReport(reportId, userId) {
    const workReport = await prisma.workReport.findFirst({
      where: {
        id: reportId,
        timeEntry: {
          userId
        }
      }
    });

    if (!workReport) {
      throw new AppError('作業報告が見つかりません', 404);
    }

    await prisma.workReport.delete({
      where: { id: reportId }
    });

    return { message: '作業報告を削除しました' };
  }

  /**
   * 作業報告一覧を取得
   */
  static async getWorkReports(userId, { page = 1, limit = 10, projectId, startDate, endDate }) {
    const skip = (page - 1) * limit;
    
    const whereConditions = {
      timeEntry: {
        userId
      }
    };

    if (projectId) {
      whereConditions.projectId = projectId;
    }

    if (startDate && endDate) {
      whereConditions.timeEntry.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [workReports, total] = await Promise.all([
      prisma.workReport.findMany({
        where: whereConditions,
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          timeEntry: {
            select: {
              date: true,
              clockIn: true,
              clockOut: true,
              workHours: true
            }
          }
        },
        orderBy: {
          timeEntry: {
            date: 'desc'
          }
        },
        skip,
        take: limit
      }),
      prisma.workReport.count({
        where: whereConditions
      })
    ]);

    return {
      workReports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * プロジェクト別統計を取得
   */
  static async getProjectStats(userId, { startDate, endDate }) {
    const whereConditions = {
      timeEntry: {
        userId
      }
    };

    if (startDate && endDate) {
      whereConditions.timeEntry.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const projectStats = await prisma.workReport.groupBy({
      by: ['projectId'],
      where: whereConditions,
      _sum: {
        workHours: true
      },
      _count: {
        id: true
      }
    });

    // プロジェクト情報を取得
    const projectIds = projectStats.map(stat => stat.projectId).filter(Boolean);
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds }
      },
      select: {
        id: true,
        name: true
      }
    });

    const projectMap = projects.reduce((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {});

    const enrichedStats = projectStats.map(stat => ({
      project: stat.projectId ? projectMap[stat.projectId] : { id: null, name: 'プロジェクト未選択' },
      totalHours: stat._sum.workHours || 0,
      reportCount: stat._count.id
    }));

    return enrichedStats;
  }

  /**
   * 重複検出
   */
  static async detectDuplicates(userId, { startDate, endDate }) {
    const whereConditions = {
      timeEntry: {
        userId
      }
    };

    if (startDate && endDate) {
      whereConditions.timeEntry.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const workReports = await prisma.workReport.findMany({
      where: whereConditions,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        timeEntry: {
          select: {
            date: true
          }
        }
      },
      orderBy: {
        timeEntry: {
          date: 'desc'
        }
      }
    });

    // 同じ日、同じプロジェクトの重複を検出
    const duplicateGroups = {};
    workReports.forEach(report => {
      const key = `${report.timeEntry.date.toISOString().split('T')[0]}-${report.projectId}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(report);
    });

    const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1);

    return duplicates;
  }
}

module.exports = WorkReportService;
