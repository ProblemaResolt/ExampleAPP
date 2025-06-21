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
        },
        _avg: {
          workingHours: true
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
      },
      _sum: {
        workingHours: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          workingHours: 'desc'
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
  static calculateMonthlyStats(timeEntries, startDate, endDate) {
    const totalDays = endDate.getDate();
    const workingDays = this.getWorkingDays(startDate, endDate);
    
    const totalWorkingHours = timeEntries.reduce((sum, entry) => {
      return sum + (entry.workingHours || 0);
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
}

module.exports = AttendanceStatsService;
