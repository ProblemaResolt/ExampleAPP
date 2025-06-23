// 遅刻判定ユーティリティ関数

/**
 * 時間文字列を分単位の数値に変換
 * @param {string} timeStr - "HH:MM"形式の時間文字列
 * @returns {number} 分単位の数値
 */
export const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  
  // "HH:MM JST"や"HH:MM"形式をサポート
  const timeOnly = timeStr.split(' ')[0]; // JST部分を除去
  const [hours, minutes] = timeOnly.split(':').map(Number);
  
  return hours * 60 + minutes;
};

/**
 * 遅刻判定を行う
 * @param {string} clockInTime - 出勤時刻 ("HH:MM JST"または"HH:MM"形式)
 * @param {string} workStartTime - 勤務開始時刻 ("HH:MM"形式)
 * @returns {Object} 遅刻判定結果
 */
export const checkLateArrival = (clockInTime, workStartTime) => {
  try {
    if (!clockInTime || !workStartTime) {
      return {
        isLate: false,
        lateMinutes: 0,
        message: 'Invalid input parameters'
      };
    }

    const clockInMinutes = timeStringToMinutes(clockInTime);
    const startTimeMinutes = timeStringToMinutes(workStartTime);
    
    const isLate = clockInMinutes > startTimeMinutes;
    const lateMinutes = isLate ? clockInMinutes - startTimeMinutes : 0;

    return {
      isLate,
      lateMinutes,
      expectedStartTime: workStartTime,
      actualStartTime: clockInTime.split(' ')[0], // JST部分を除去
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
};

/**
 * 月次勤怠データから統計を計算する
 * @param {Object} attendanceData - 勤怠データ (日付をキーとするオブジェクト)
 * @param {Object} workSettings - 勤務設定
 * @returns {Object} 計算された統計
 */
export const calculateMonthlyStats = (attendanceData, workSettings) => {
  const entries = Object.values(attendanceData).filter(entry => entry);
  
  let workDays = 0;
  let totalHours = 0;
  let overtimeHours = 0;
  let lateCount = 0;
  let leaveDays = 0;
  let transportationCost = 0;

  const workStartTime = workSettings?.workStartTime || workSettings?.startTime || '09:00';
  const overtimeThreshold = workSettings?.overtimeThreshold || 8;

  entries.forEach(entry => {
    // 出勤日数
    if (entry.clockIn && entry.clockOut) {
      workDays++;
    }

    // 総勤務時間・残業時間
    if (entry.workHours) {
      totalHours += entry.workHours;
      if (entry.workHours > overtimeThreshold) {
        overtimeHours += entry.workHours - overtimeThreshold;
      }
    }

    // 遅刻判定
    if (entry.clockIn) {
      const lateResult = checkLateArrival(entry.clockIn, workStartTime);
      if (lateResult.isLate) {
        lateCount++;
      }
    }

    // 休暇日数
    if (entry.leaveType && entry.leaveType !== '') {
      leaveDays++;
    }

    // 交通費
    if (entry.transportationCost) {
      transportationCost += entry.transportationCost;
    }
  });

  return {
    workDays,
    totalHours: Math.round(totalHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    lateCount,
    leaveDays,
    transportationCost
  };
};

/**
 * 勤怠データに遅刻判定結果を追加する
 * @param {Object} attendanceData - 勤怠データ
 * @param {string} workStartTime - 勤務開始時刻
 * @returns {Object} 遅刻判定結果が追加された勤怠データ
 */
export const addLateIndicators = (attendanceData, workStartTime) => {
  const updatedData = { ...attendanceData };

  Object.keys(updatedData).forEach(dateKey => {
    const entry = updatedData[dateKey];
    if (entry && entry.clockIn) {
      const lateResult = checkLateArrival(entry.clockIn, workStartTime);
      updatedData[dateKey] = {
        ...entry,
        lateInfo: lateResult
      };
    }
  });

  return updatedData;
};
