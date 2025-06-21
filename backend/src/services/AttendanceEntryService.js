const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 勤怠エントリサービス
 */
class AttendanceEntryService {
  /**
   * 勤怠記録一覧を取得
   */
  static async getEntries(userId, userRole, { page = 1, limit = 50, startDate, endDate, status, userFilter }) {
    const offset = (page - 1) * limit;
    const where = {};

    // 管理者以外は自分の記録のみ表示
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      where.userId = userId;
    } else if (userFilter) {
      where.userId = userFilter;
    }

    // 日付範囲フィルタ
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // ステータスフィルタ
    if (status) {
      where.status = status;
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          breakRecords: true,
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.timeEntry.count({ where })
    ]);

    return {
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 月次レポートを取得
   */
  static async getMonthlyReport(userId, userRole, { year, month, userFilter }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // 管理者以外は自分の記録のみ
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      where.userId = userId;
    } else if (userFilter) {
      where.userId = userFilter;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        breakRecords: true
      },
      orderBy: { date: 'asc' }
    });

    // 統計情報を計算
    const totalWorkHours = entries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    const totalWorkDays = entries.filter(entry => entry.clockIn && entry.clockOut).length;
    const averageWorkHours = totalWorkDays > 0 ? totalWorkHours / totalWorkDays : 0;

    const statusCounts = entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});

    return {
      entries,
      summary: {
        period: { year: parseInt(year), month: parseInt(month) },
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        totalWorkDays,
        averageWorkHours: parseFloat(averageWorkHours.toFixed(2)),
        statusCounts
      }
    };
  }

  /**
   * 月別勤怠データを取得（詳細版）
   */
  static async getMonthlyData(userId, userRole, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // 管理者以外は自分の記録のみ
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      where.userId = userId;
    }

    const attendanceData = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workSettings: true
          }
        },
        breakRecords: true,
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });

    // ユーザー別にグループ化
    const userGroups = attendanceData.reduce((acc, entry) => {
      const userId = entry.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          entries: []
        };
      }
      acc[userId].entries.push(entry);
      return acc;
    }, {});

    // 各ユーザーの統計を計算
    const usersWithStats = Object.values(userGroups).map(group => {
      const { user, entries } = group;
      
      const workDays = entries.filter(entry => entry.clockIn && entry.clockOut);
      const totalWorkHours = workDays.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const approvedCount = entries.filter(entry => entry.status === 'APPROVED').length;
      const pendingCount = entries.filter(entry => entry.status === 'PENDING').length;
      const rejectedCount = entries.filter(entry => entry.status === 'REJECTED').length;

      return {
        user,
        stats: {
          totalEntries: entries.length,
          workDays: workDays.length,
          totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
          averageWorkHours: workDays.length > 0 ? parseFloat((totalWorkHours / workDays.length).toFixed(2)) : 0,
          approvedCount,
          pendingCount,
          rejectedCount
        },
        entries
      };
    });

    return {
      period: { year: parseInt(year), month: parseInt(month) },
      users: usersWithStats,
      summary: {
        totalUsers: usersWithStats.length,
        totalEntries: attendanceData.length,
        totalWorkHours: usersWithStats.reduce((sum, user) => sum + user.stats.totalWorkHours, 0)
      }
    };
  }
}

module.exports = AttendanceEntryService;
