const prisma = require('../lib/prisma');

/**
 * 時間文字列から勤務時間を計算するヘルパー関数
 * @param {string} startTime - 開始時間 (HH:MM)
 * @param {string} endTime - 終了時間 (HH:MM)
 * @param {number} breakTime - 休憩時間（分）
 * @returns {number} 勤務時間（時間）
 */
function calculateHoursFromTimes(startTime, endTime, breakTime = 0) {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  // 日をまたぐ場合の処理
  let workMinutes = endTotalMinutes - startTotalMinutes;
  if (workMinutes < 0) {
    workMinutes += 24 * 60; // 24時間を追加
  }
  
  const totalWorkMinutes = workMinutes - (breakTime || 0);
  return Math.max(0, totalWorkMinutes / 60);
}

/**
 * ユーザーの効果的な勤務設定を取得する統合関数
 * プロジェクト勤務設定を個人設定より優先する
 * 
 * @param {string} userId - ユーザーID
 * @param {Date} startDate - 期間開始日
 * @param {Date} endDate - 期間終了日
 * @returns {Object} 効果的な勤務設定
 */
async function getEffectiveWorkSettings(userId, startDate, endDate) {
  console.log(`🔧 [WORK_SETTINGS] Getting effective work settings for user ${userId} (${startDate.toISOString()} - ${endDate.toISOString()})`);

  // 1. ユーザーの個人勤務設定を取得
  const userSettings = await prisma.userWorkSettings.findUnique({
    where: { userId }
  });

  console.log(`👤 [WORK_SETTINGS] User settings:`, userSettings ? {
    workHours: userSettings.workHours,
    workStartTime: userSettings.workStartTime,
    workEndTime: userSettings.workEndTime,
    breakTime: userSettings.breakTime
  } : 'Not found');

  // 2. ユーザーが参加しているプロジェクトの勤務設定を取得
  const projectMemberships = await prisma.projectMembership.findMany({
    where: {
      userId,
      project: {
        // プロジェクトが指定期間と重複しているかチェック
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: null }
            ]
          }
        ]
      }
    },
    include: {
      project: {
        include: {
          workSettings: {
            include: {
              userAssignments: {
                where: { 
                  userId,
                  isActive: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`📋 [WORK_SETTINGS] Found ${projectMemberships.length} project memberships`);

  // 3. アクティブなプロジェクト勤務設定を検索（優先順位: 最新の設定）
  let projectWorkSettings = null;
  let targetMembership = null;
  let latestSettingDate = null;

  for (const membership of projectMemberships) {
    const workSettings = membership.project.workSettings;
    console.log(`📊 [WORK_SETTINGS] Project: ${membership.project.name}, workSettings count: ${workSettings?.length || 0}`);
    
    if (workSettings && workSettings.length > 0) {
      for (const setting of workSettings) {
        console.log(`⚙️  [WORK_SETTINGS] Checking setting:`, {
          id: setting.id,
          name: setting.name,
          workStartTime: setting.workStartTime,
          workEndTime: setting.workEndTime,
          userAssignments: setting.userAssignments?.length || 0
        });
        
        // ユーザーがこの設定にアクティブに割り当てられているかチェック
        const userAssignment = setting.userAssignments?.find(ua => ua.userId === userId && ua.isActive);
        if (userAssignment) {
          // より新しい設定があるかチェック
          const assignmentDate = new Date(userAssignment.startDate || userAssignment.createdAt);
          if (!latestSettingDate || assignmentDate > latestSettingDate) {
            projectWorkSettings = setting;
            targetMembership = membership;
            latestSettingDate = assignmentDate;
            console.log(`✅ [WORK_SETTINGS] Found newer project work settings:`, {
              id: projectWorkSettings.id,
              name: projectWorkSettings.name,
              workStartTime: projectWorkSettings.workStartTime,
              workEndTime: projectWorkSettings.workEndTime,
              assignmentDate: assignmentDate.toISOString()
            });
          }
        }
      }
    }
  }

  // 4. 効果的な設定を決定（プロジェクト設定を優先）
  console.log(`🎯 [WORK_SETTINGS] Determining effective settings. Project settings found: ${!!projectWorkSettings}`);
  
  const effective = projectWorkSettings ? {
    // プロジェクト設定を優先
    workHours: projectWorkSettings.workEndTime && projectWorkSettings.workStartTime ?
      calculateHoursFromTimes(projectWorkSettings.workStartTime, projectWorkSettings.workEndTime, projectWorkSettings.breakDuration) :
      (userSettings?.workHours || 8),
    workStartTime: projectWorkSettings.workStartTime || userSettings?.workStartTime || '09:00',
    workEndTime: projectWorkSettings.workEndTime || userSettings?.workEndTime || '18:00',
    breakTime: projectWorkSettings.breakDuration || userSettings?.breakTime || 60,
    overtimeThreshold: projectWorkSettings.overtimeThreshold || userSettings?.overtimeThreshold || 8,
    transportationCost: projectWorkSettings.transportationCost || userSettings?.transportationCost || 0,
    timeInterval: userSettings?.timeInterval || 15, // 時間間隔は個人設定を使用
    settingSource: 'project',
    projectName: targetMembership?.project?.name || 'Unknown Project',
    projectWorkSettingName: projectWorkSettings.name || 'Unnamed Setting'
  } : {
    // 個人設定を使用
    workHours: userSettings?.workHours || 8,
    workStartTime: userSettings?.workStartTime || '09:00',
    workEndTime: userSettings?.workEndTime || '18:00',
    breakTime: userSettings?.breakTime || 60,
    overtimeThreshold: userSettings?.overtimeThreshold || 8,
    transportationCost: userSettings?.transportationCost || 0,
    timeInterval: userSettings?.timeInterval || 15,
    settingSource: 'user',
    projectName: null,
    projectWorkSettingName: null
  };

  // 5. プロジェクト設定名を分かりやすく設定
  if (projectWorkSettings && targetMembership) {
    effective.projectWorkSettingName = `${targetMembership.project.name} - ${projectWorkSettings.name} (${effective.workStartTime}-${effective.workEndTime})`;
  }

  console.log(`📊 [WORK_SETTINGS] Final effective settings:`, {
    settingSource: effective.settingSource,
    workStartTime: effective.workStartTime,
    workEndTime: effective.workEndTime,
    workHours: effective.workHours,
    breakTime: effective.breakTime,
    projectWorkSettingName: effective.projectWorkSettingName
  });

  return {
    userSettings,
    projectWorkSettings,
    effective
  };
}

/**
 * 出勤時刻の遅刻判定を行う
 * @param {Date} clockInTime - 出勤時刻
 * @param {Object} workSettings - 効果的な勤務設定
 * @returns {Object} 遅刻判定結果
 */
function checkLateArrival(clockInTime, workSettings) {
  const clockInTimeStr = clockInTime.toTimeString().slice(0, 5); // HH:MM形式
  const expectedStartTime = workSettings.workStartTime;
  
  // 勤務開始時間が設定されていない場合はfalseを返す
  if (!expectedStartTime) {
    console.warn('workStartTime is not defined in workSettings');
    return {
      isLate: false,
      lateMinutes: 0,
      expectedStartTime: 'N/A',
      actualStartTime: clockInTimeStr,
      settingSource: workSettings.settingSource || 'unknown',
      projectName: workSettings.projectName || null
    };
  }
  
  const isLate = clockInTimeStr > expectedStartTime;
  
  if (isLate) {
    // 遅刻時間を計算
    const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
    const [clockInHour, clockInMinute] = clockInTimeStr.split(':').map(Number);
    
    const expectedMinutes = expectedHour * 60 + expectedMinute;
    const clockInMinutes = clockInHour * 60 + clockInMinute;
    
    const lateMinutes = clockInMinutes - expectedMinutes;
    
    return {
      isLate: true,
      lateMinutes,
      expectedStartTime,
      actualStartTime: clockInTimeStr,
      settingSource: workSettings.settingSource,
      projectName: workSettings.projectName
    };
  }
    return {
    isLate: false,
    lateMinutes: 0,
    expectedStartTime,
    actualStartTime: clockInTimeStr,
    settingSource: workSettings.settingSource,
    projectName: workSettings.projectName
  };
}

/**
 * デフォルトの個人勤務設定を作成する
 * @param {string} userId - ユーザーID
 * @returns {Object} 作成された勤務設定
 */
async function createDefaultUserWorkSettings(userId) {
  console.log(`🆕 [WORK_SETTINGS] Creating default work settings for user ${userId}`);
  
  const defaultSettings = await prisma.userWorkSettings.create({
    data: {
      userId,
      workHours: 8.0,
      workStartTime: '09:00',
      workEndTime: '18:00',
      breakTime: 60,
      overtimeThreshold: 8,
      transportationCost: 0,
      timeInterval: 15
    }
  });
  
  console.log(`✅ [WORK_SETTINGS] Created default settings:`, defaultSettings);
  return defaultSettings;
}

module.exports = {
  getEffectiveWorkSettings,
  calculateHoursFromTimes,
  checkLateArrival,
  createDefaultUserWorkSettings
};
