const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 勤怠統計サービス
 */
class AttendanceStatsService {
  /**
   * 月次勤怠統計を取得
   */
  static async getMonthlyStats(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        workReports: {
          include: {
            project: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // 統計計算
    const stats = this.calculateMonthlyStats(timeEntries, startDate, endDate);
    
    return {
      stats,
      entries: timeEntries
    };
  }

  /**
   * 会社全体の統計を取得
   */
  static async getCompanyStats(companyId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [attendanceData, approvalStats] = await Promise.all([
      // 出勤統計
      prisma.timeEntry.groupBy({
        by: ['status'],
        where: {
          user: {
            companyId
          },
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },        _avg: {
          workHours: true
        }
      }),
      // 承認状況統計
      prisma.timeEntry.groupBy({
        by: ['status'],
        where: {
          user: {
            companyId
          },
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        }
      })
    ]);

    // 従業員別の勤務時間ランキング
    const employeeRanking = await prisma.timeEntry.groupBy({
      by: ['userId'],
      where: {
        user: {
          companyId
        },
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'APPROVED'
      },      _sum: {
        workHours: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          workHours: 'desc'
        }
      },
      take: 10
    });

    // ユーザー情報を取得
    const userIds = employeeRanking.map(item => item.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedRanking = employeeRanking.map(item => ({
      ...item,
      user: userMap[item.userId]
    }));

    return {
      attendanceData,
      approvalStats,
      employeeRanking: enrichedRanking
    };
  }

  /**
   * 統計計算の共通ロジック
   */
  static calculateMonthlyStats(timeEntries, startDate, endDate) {    const totalDays = endDate.getDate();
    const workingDays = this.getWorkingDays(startDate, endDate);
    
    const totalWorkingHours = timeEntries.reduce((sum, entry) => {
      return sum + (entry.workHours || 0);
    }, 0);

    const attendedDays = timeEntries.filter(entry => entry.clockIn).length;
    const lateArrivals = timeEntries.filter(entry => this.isLateArrival(entry)).length;
    const approvedDays = timeEntries.filter(entry => entry.status === 'APPROVED').length;
    const pendingDays = timeEntries.filter(entry => entry.status === 'PENDING').length;

    const averageWorkingHours = attendedDays > 0 ? totalWorkingHours / attendedDays : 0;

    return {
      totalDays,
      workingDays,
      attendedDays,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      averageWorkingHours: parseFloat(averageWorkingHours.toFixed(2)),
      lateArrivals,
      approvedDays,
      pendingDays,
      attendanceRate: workingDays > 0 ? (attendedDays / workingDays * 100).toFixed(1) : 0
    };
  }

  /**
   * 営業日数を計算
   */
  static getWorkingDays(startDate, endDate) {
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 土日を除く
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }
  /**
   * 遅刻判定
   */
  static isLateArrival(timeEntry) {
    if (!timeEntry.clockIn) return false;
    
    const clockInTime = new Date(timeEntry.clockIn);
    const hours = clockInTime.getHours();
    const minutes = clockInTime.getMinutes();
    
    // 9:00を基準とした遅刻判定
    return hours > 9 || (hours === 9 && minutes > 0);
  }

  /**
   * 個人ユーザーの統計を取得
   */
  static async getUserStats(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // ユーザー情報と勤怠データを取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        workReports: {
          include: {
            project: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });    // 統計計算
    const workDays = timeEntries.filter(entry => entry.clockIn).length;
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    const overtimeHours = timeEntries.reduce((sum, entry) => {
      const hours = entry.workHours || 0;
      return sum + (hours > 8 ? hours - 8 : 0);
    }, 0);
    const lateCount = timeEntries.filter(entry => this.isLateArrival(entry)).length;
    const leaveDays = timeEntries.filter(entry => entry.leaveType).length;
    const pendingCount = timeEntries.filter(entry => entry.status === 'PENDING').length;
    const transportationCost = timeEntries.reduce((sum, entry) => sum + (entry.transportationCost || 0), 0);

    // 平均時刻計算
    const clockInTimes = timeEntries.filter(entry => entry.clockIn).map(entry => entry.clockIn);
    const clockOutTimes = timeEntries.filter(entry => entry.clockOut).map(entry => entry.clockOut);
    
    const avgClockIn = this.calculateAverageTime(clockInTimes);
    const avgClockOut = this.calculateAverageTime(clockOutTimes);
    const avgWorkHours = workDays > 0 ? (totalHours / workDays).toFixed(2) : '0.00';

    return {
      user,
      workDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      lateCount,
      leaveDays,
      pendingCount,
      transportationCost,
      avgClockIn,
      avgClockOut,
      avgWorkHours
    };
  }

  /**
   * チーム統計を取得
   */
  static async getTeamStats(managerId, companyId, year, month, projectId = null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // プロジェクトフィルターの条件
    let projectFilter = {};
    if (projectId) {
      projectFilter = {
        projectMemberships: {
          some: {
            projectId: projectId
          }
        }
      };
    }

    // チームメンバーを取得
    const teamMembers = await prisma.user.findMany({
      where: {
        companyId,
        ...projectFilter,
        OR: [
          { managerId }, // 直接の部下
          { id: managerId } // 自分自身
        ]
      },
      include: {
        timeEntries: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        projectMemberships: {
          include: {
            project: true
          }
        }
      }
    });

    // 全体統計
    let totalMembers = teamMembers.length;
    let totalTeamHours = 0;
    let totalPending = 0;
    let totalTransportation = 0;

    // メンバー別統計
    const memberStats = teamMembers.map(member => {      const timeEntries = member.timeEntries;
      const workDays = timeEntries.filter(entry => entry.clockIn).length;
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const overtimeHours = timeEntries.reduce((sum, entry) => {
        const hours = entry.workHours || 0;
        return sum + (hours > 8 ? hours - 8 : 0);
      }, 0);
      const lateCount = timeEntries.filter(entry => this.isLateArrival(entry)).length;
      const pendingCount = timeEntries.filter(entry => entry.status === 'PENDING').length;
      const transportationCost = timeEntries.reduce((sum, entry) => sum + (entry.transportationCost || 0), 0);

      // プロジェクト名取得（最初のプロジェクト）
      const projectName = member.projectMemberships.length > 0 
        ? member.projectMemberships[0].project.name 
        : '未配属';

      // 全体統計に加算
      totalTeamHours += totalHours;
      totalPending += pendingCount;
      totalTransportation += transportationCost;

      return {
        userId: member.id,
        name: `${member.lastName} ${member.firstName}`,
        projectName,
        workDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        lateCount,
        pendingCount,
        transportationCost
      };
    });

    return {
      totalMembers,
      totalTeamHours: parseFloat(totalTeamHours.toFixed(2)),
      totalPending,
      totalTransportation,
      memberStats
    };
  }

  /**
   * 平均時刻を計算
   */
  static calculateAverageTime(times) {
    if (!times || times.length === 0) return '--:--';

    const totalMinutes = times.reduce((sum, time) => {
      const date = new Date(time);
      return sum + (date.getHours() * 60 + date.getMinutes());
    }, 0);

    const avgMinutes = Math.round(totalMinutes / times.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

module.exports = AttendanceStatsService;
