const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * その他の勤怠関連サービス
 */
class MiscAttendanceService {
  /**
   * 一括交通費登録
   */
  static async bulkTransportation(userId, userRole, companyId, { entries }) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('一括交通費登録の権限がありません', 403);
    }

    const results = [];
    const errors = [];

    for (const entry of entries) {
      try {
        // ユーザーの存在確認
        const user = await prisma.user.findUnique({
          where: { id: entry.userId }
        });

        if (!user) {
          errors.push({
            userId: entry.userId,
            error: 'ユーザーが見つかりません'
          });
          continue;
        }

        // 会社管理者の場合、自社ユーザーのみ処理
        if (userRole === 'COMPANY' && user.companyId !== companyId) {
          errors.push({
            userId: entry.userId,
            error: '他社のユーザーは処理できません'
          });
          continue;
        }

        // 該当日付の勤怠記録を検索
        const timeEntry = await prisma.timeEntry.findFirst({
          where: {
            userId: entry.userId,
            date: new Date(entry.date)
          }
        });

        if (!timeEntry) {
          errors.push({
            userId: entry.userId,
            date: entry.date,
            error: '該当日の勤怠記録が見つかりません'
          });
          continue;
        }

        // 交通費を更新
        const updatedEntry = await prisma.timeEntry.update({
          where: { id: timeEntry.id },
          data: {
            transportation: parseFloat(entry.transportation),
            transportationNote: entry.transportationNote || null
          }
        });

        results.push({
          userId: entry.userId,
          date: entry.date,
          timeEntryId: updatedEntry.id,
          transportation: updatedEntry.transportation,
          status: 'success'
        });

      } catch (error) {
        errors.push({
          userId: entry.userId,
          date: entry.date,
          error: error.message
        });
      }
    }

    return {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    };
  }

  /**
   * 勤怠データ更新（管理者用）
   */
  static async updateAttendance(userId, userRole, companyId, timeEntryId, updateData) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('勤怠データ更新の権限がありません', 403);
    }

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: true
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    // 会社管理者の場合、自社ユーザーのみ更新可能
    if (userRole === 'COMPANY' && timeEntry.user.companyId !== companyId) {
      throw new AppError('他社のユーザーの勤怠は更新できません', 403);
    }

    // 勤務時間の再計算（出勤・退勤時刻が変更された場合）
    let workHours = timeEntry.workHours;
    if (updateData.clockIn || updateData.clockOut) {
      const clockIn = updateData.clockIn ? new Date(updateData.clockIn) : timeEntry.clockIn;
      const clockOut = updateData.clockOut ? new Date(updateData.clockOut) : timeEntry.clockOut;
      
      if (clockIn && clockOut) {
        const workMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));
        workHours = workMinutes / 60;
      }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        ...updateData,
        workHours,
        updatedBy: userId,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
      }
    });

    return updatedEntry;
  }

  /**
   * テスト用エンドポイント
   */
  static async getTestData() {
    const currentTime = new Date();
    const serverInfo = {
      timestamp: currentTime.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };

    return {
      message: 'Attendance API is working',
      server: serverInfo
    };
  }
}

module.exports = MiscAttendanceService;
