const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 時刻打刻サービス
 */
class ClockService {
  /**
   * 出勤打刻
   */
  static async clockIn(userId, { date, location, note }) {
    const clockInTime = new Date();

    // 同日の勤怠記録があるかチェック
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        userId,
        date: new Date(date)
      }
    });

    let timeEntry;
    if (existingEntry) {
      // 既存の記録を更新
      timeEntry = await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          clockIn: clockInTime,
          note: note || existingEntry.note,
          status: 'PENDING'
        }
      });
    } else {
      // 新規作成
      timeEntry = await prisma.timeEntry.create({
        data: {
          userId,
          date: new Date(date),
          clockIn: clockInTime,
          note: note || '',
          status: 'PENDING'
        }
      });
    }

    return timeEntry;
  }

  /**
   * 退勤打刻
   */
  static async clockOut(timeEntryId, userId, { location, note }) {
    const clockOutTime = new Date();

    // timeEntryが存在し、ユーザーが所有者であることを確認
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    if (!timeEntry.clockIn) {
      throw new AppError('出勤打刻が記録されていません', 400);
    }

    if (timeEntry.clockOut) {
      throw new AppError('既に退勤打刻が記録されています', 400);
    }

    // 勤務時間を計算
    const workingMinutes = Math.floor((clockOutTime - timeEntry.clockIn) / (1000 * 60));
    const breakMinutes = timeEntry.breakTime || 0;
    const actualWorkingMinutes = Math.max(0, workingMinutes - breakMinutes);
    const workingHours = actualWorkingMinutes / 60;

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        clockOut: clockOutTime,
        workingHours: parseFloat(workingHours.toFixed(2)),
        note: note || timeEntry.note,
        status: 'PENDING'
      }
    });

    return updatedTimeEntry;
  }

  /**
   * 休憩開始
   */
  static async startBreak(timeEntryId, userId, { reason }) {
    const breakStartTime = new Date();

    // timeEntryが存在し、ユーザーが所有者であることを確認
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: timeEntryId,
        userId
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    if (!timeEntry.clockIn) {
      throw new AppError('出勤打刻が記録されていません', 400);
    }

    if (timeEntry.clockOut) {
      throw new AppError('既に退勤済みです', 400);
    }

    // 進行中の休憩があるかチェック
    const ongoingBreak = await prisma.breakRecord.findFirst({
      where: {
        timeEntryId,
        endTime: null
      }
    });

    if (ongoingBreak) {
      throw new AppError('既に休憩中です', 400);
    }

    const breakRecord = await prisma.breakRecord.create({
      data: {
        timeEntryId,
        startTime: breakStartTime,
        reason: reason || '休憩'
      }
    });

    return breakRecord;
  }

  /**
   * 休憩終了
   */
  static async endBreak(breakId, userId) {
    const breakEndTime = new Date();

    // 休憩記録が存在し、ユーザーが所有者であることを確認
    const breakRecord = await prisma.breakRecord.findFirst({
      where: {
        id: breakId,
        timeEntry: {
          userId
        }
      },
      include: {
        timeEntry: true
      }
    });

    if (!breakRecord) {
      throw new AppError('休憩記録が見つかりません', 404);
    }

    if (breakRecord.endTime) {
      throw new AppError('既に休憩終了済みです', 400);
    }

    // 休憩時間を計算（分単位）
    const breakDuration = Math.floor((breakEndTime - breakRecord.startTime) / (1000 * 60));

    const updatedBreakRecord = await prisma.breakRecord.update({
      where: { id: breakId },
      data: {
        endTime: breakEndTime,
        duration: breakDuration
      }
    });

    // timeEntryの総休憩時間を更新
    const totalBreakTime = await prisma.breakRecord.aggregate({
      where: {
        timeEntryId: breakRecord.timeEntryId,
        endTime: { not: null }
      },
      _sum: {
        duration: true
      }
    });

    await prisma.timeEntry.update({
      where: { id: breakRecord.timeEntryId },
      data: {
        breakTime: totalBreakTime._sum.duration || 0
      }
    });

    return updatedBreakRecord;
  }
}

module.exports = ClockService;
