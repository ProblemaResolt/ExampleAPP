const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 時刻文字列（HH:MM）をDateTime形式に変換
 * @param {string} timeString - "HH:MM"形式の時刻文字列
 * @param {Date} baseDate - ベースとなる日付（省略時は今日）
 * @returns {Date} - DateTime形式（UTC）
 */
function parseTimeString(timeString, baseDate = new Date()) {
  if (!timeString) return null;
  
  // すでにDateオブジェクトの場合はそのまま返す
  if (timeString instanceof Date) return timeString;
  
  // ISO形式の場合はそのまま変換
  if (timeString.includes('T') || timeString.includes('Z')) {
    return new Date(timeString);
  }
  
  // HH:MM形式の場合（JSTとして処理してからUTCに変換）
  const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    
    // baseDateをJSTとして扱う
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const date = baseDate.getDate();
    
    // JSTでの日時を作成
    const jstDate = new Date(year, month, date, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    // JSTからUTCに変換（9時間引く）
    const utcDate = new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));
    
    console.log(`DEBUG parseTimeString - Input: ${timeString}, JST: ${jstDate.toISOString()}, UTC: ${utcDate.toISOString()}`);
    
    return utcDate;
  }
  
  // その他の形式の場合は通常のDate変換を試行
  const parsed = new Date(timeString);
  if (isNaN(parsed.getTime())) {
    throw new AppError(`無効な時刻形式です: ${timeString}`, 400);
  }
  return parsed;
}

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
    }    let timeEntry;
    
    // timeEntryIdがある場合はIDで検索、ない場合はdateとuserIdで検索
    if (timeEntryId) {
      timeEntry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        include: {
          user: true
        }
      });    } else if (updateData.date) {
      // dateと現在のuserIdまたはtargetUserIdの組み合わせで検索
      const targetUserId = updateData.targetUserId || userId;
      const searchDate = new Date(updateData.date);
      timeEntry = await prisma.timeEntry.findFirst({
        where: {
          userId: targetUserId,
          date: {
            gte: new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate()),
            lt: new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate() + 1)
          }
        },
        include: {
          user: true
        }
      });
      
      // 勤怠記録が見つからない場合は新規作成
      if (!timeEntry) {
        const dateOnly = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
        timeEntry = await prisma.timeEntry.create({
          data: {
            userId: targetUserId,
            date: dateOnly,
            status: 'DRAFT'
          },
          include: {
            user: true
          }
        });
      }
    } else {
      throw new AppError('勤怠記録の特定に必要な情報が不足しています', 400);
    }

    if (!timeEntry) {
      throw new AppError('勤怠記録の作成に失敗しました', 500);
    }

    // 会社管理者の場合、自社ユーザーのみ更新可能
    if (userRole === 'COMPANY' && timeEntry.user.companyId !== companyId) {
      throw new AppError('他社のユーザーの勤怠は更新できません', 403);
    }    // 勤務時間の再計算（出勤・退勤時刻が変更された場合）
    let workHours = timeEntry.workHours;
    if (updateData.clockIn || updateData.clockOut) {
      const recordDate = timeEntry.date;
      const clockIn = updateData.clockIn ? parseTimeString(updateData.clockIn, recordDate) : timeEntry.clockIn;
      const clockOut = updateData.clockOut ? parseTimeString(updateData.clockOut, recordDate) : timeEntry.clockOut;
      
      if (clockIn && clockOut) {
        const workMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));
        workHours = workMinutes / 60;
      }
    }    // 更新データの準備
    const processedUpdateData = { ...updateData };
    
    // targetUserIdを除外（これはPrismaのTimeEntryフィールドではない）
    delete processedUpdateData.targetUserId;
    
    // 時刻フィールドの変換
    if (updateData.clockIn) {
      processedUpdateData.clockIn = parseTimeString(updateData.clockIn, timeEntry.date);
    }
    if (updateData.clockOut) {
      processedUpdateData.clockOut = parseTimeString(updateData.clockOut, timeEntry.date);
    }const updatedEntry = await prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: {
        ...processedUpdateData,
        workHours,
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
        breakEntries: true,
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
