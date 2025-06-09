const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 遅刻判定を行う関数
 * @param {Date} clockInTime - 出勤時刻
 * @param {Object} workSettings - 勤務設定
 * @returns {Object} 遅刻判定結果
 */
function checkLateArrival(clockInTime, workSettings) {
  try {
    if (!clockInTime || !workSettings) {
      return {
        isLate: false,
        lateMinutes: 0,
        message: 'Invalid input parameters'
      };
    }

    // 出勤時刻を HH:MM 形式の文字列に変換
    const clockInStr = clockInTime.toTimeString().slice(0, 5);
    const workStartTime = workSettings.workStartTime || workSettings.startTime || '09:00';

    console.log(`🔍 Late arrival check: clockIn="${clockInStr}", startTime="${workStartTime}"`);

    // 時刻を分単位に変換して数値比較
    const [clockInHour, clockInMinute] = clockInStr.split(':').map(Number);
    const [startHour, startMinute] = workStartTime.split(':').map(Number);
    
    const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
    const startTotalMinutes = startHour * 60 + startMinute;
    
    // 数値比較で遅刻判定
    const isLate = clockInTotalMinutes > startTotalMinutes;
    
    let lateMinutes = 0;
    if (isLate) {
      lateMinutes = clockInTotalMinutes - startTotalMinutes;
    }

    return {
      isLate,
      lateMinutes,
      expectedStartTime: workStartTime,
      actualStartTime: clockInStr,
      message: isLate ? `${lateMinutes}分の遅刻` : '正常出勤'
    };
  } catch (error) {
    console.error('Error in checkLateArrival:', error);
    return {
      isLate: false,
      lateMinutes: 0,
      message: 'Error occurred during late arrival check'
    };
  }
}

/**
 * 効果的な勤務設定を取得する関数
 * @param {string} userId - ユーザーID
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Object} 勤務設定
 */
async function getEffectiveWorkSettings(userId, startDate, endDate) {
  try {
    console.log(`🔍 Getting work settings for user ${userId} from ${startDate} to ${endDate}`);

    // プロジェクト勤務設定を優先的に取得
    const projectWorkSettings = await prisma.userProjectWorkSettings.findFirst({
      where: {
        userId: userId,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } }
        ],
        startDate: { lte: endDate }
      },
      include: {
        projectWorkSettings: {
          include: {
            project: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (projectWorkSettings) {
      console.log(`✅ Found project work settings: ${projectWorkSettings.projectWorkSettings.name}`);
      return {
        effective: {
          workStartTime: projectWorkSettings.projectWorkSettings.workStartTime,
          workEndTime: projectWorkSettings.projectWorkSettings.workEndTime,
          breakTime: projectWorkSettings.projectWorkSettings.breakDuration,
          workHours: projectWorkSettings.projectWorkSettings.standardHours || 8,
          overtimeThreshold: projectWorkSettings.projectWorkSettings.overtimeThreshold || 8,
          transportationCost: 0,
          timeInterval: 15,
          settingSource: 'project',
          projectWorkSettingName: projectWorkSettings.projectWorkSettings.name,
          projectName: projectWorkSettings.projectWorkSettings.project.name
        },
        projectWorkSettings: projectWorkSettings.projectWorkSettings
      };
    }

    // 個人勤務設定を取得
    const userWorkSettings = await prisma.userWorkSettings.findUnique({
      where: { userId: userId }
    });

    if (userWorkSettings) {
      console.log(`✅ Found user work settings`);
      return {
        effective: {
          workStartTime: userWorkSettings.workStartTime,
          workEndTime: userWorkSettings.workEndTime,
          breakTime: userWorkSettings.breakTime,
          workHours: userWorkSettings.workHours,
          overtimeThreshold: userWorkSettings.overtimeThreshold,
          transportationCost: userWorkSettings.transportationCost,
          timeInterval: userWorkSettings.timeInterval,
          settingSource: 'user',
          projectWorkSettingName: null,
          projectName: null
        }
      };
    }

    // デフォルト設定を返す
    console.log(`⚠️ No work settings found, using defaults`);
    return {
      effective: {
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakTime: 60,
        workHours: 8,
        overtimeThreshold: 8,
        transportationCost: 0,
        timeInterval: 15,
        settingSource: 'default',
        projectWorkSettingName: null,
        projectName: null
      }
    };
  } catch (error) {
    console.error('Error in getEffectiveWorkSettings:', error);
    return {
      effective: {
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakTime: 60,
        workHours: 8,
        overtimeThreshold: 8,
        transportationCost: 0,
        timeInterval: 15,
        settingSource: 'error',
        projectWorkSettingName: null,
        projectName: null
      }
    };
  }
}

/**
 * 時間から時間数を計算する関数
 * @param {string} startTime - 開始時間 (HH:MM)
 * @param {string} endTime - 終了時間 (HH:MM)
 * @param {number} breakMinutes - 休憩時間（分）
 * @returns {number} 労働時間数
 */
function calculateHoursFromTimes(startTime, endTime, breakMinutes = 0) {
  try {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    let endTotalMinutes = endHour * 60 + endMinute;
    
    // 翌日にまたがる場合
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }
    
    const workMinutes = endTotalMinutes - startTotalMinutes - breakMinutes;
    return Math.max(0, workMinutes / 60);
  } catch (error) {
    console.error('Error in calculateHoursFromTimes:', error);
    return 0;
  }
}

module.exports = {
  checkLateArrival,
  getEffectiveWorkSettings,
  calculateHoursFromTimes
};