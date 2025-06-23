/**
 * 週末判定ユーティリティ（フロントエンド用）
 * プロジェクト毎の週開始日設定に基づいて週末を判定
 */

/**
 * 週開始日から週末曜日を計算
 * @param {number} weekStartDay - 週開始日（0=日曜, 1=月曜...6=土曜）
 * @returns {Array} 週末曜日の配列
 */
export const calculateWeekendDays = (weekStartDay) => {
  // 週開始日の前2日間を週末とする
  const weekend1 = (weekStartDay - 2 + 7) % 7;
  const weekend2 = (weekStartDay - 1 + 7) % 7;
  return [weekend1, weekend2];
};

/**
 * 指定した日付が週末かどうかを判定
 * @param {Date} date - 判定対象の日付
 * @param {number} weekStartDay - 週開始日（0=日曜, 1=月曜...6=土曜）
 * @returns {boolean} 週末の場合true
 */
export const isWeekendDay = (date, weekStartDay = 1) => {
  const dayOfWeek = date.getDay();
  const weekendDays = calculateWeekendDays(weekStartDay);
  return weekendDays.includes(dayOfWeek);
};

/**
 * デバッグ用：週末設定を取得
 * @param {number} weekStartDay - 週開始日
 * @returns {Object} 週末設定の詳細
 */
export const getWeekendInfo = (weekStartDay = 1) => {
  const weekendDays = calculateWeekendDays(weekStartDay);
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  return {
    weekStartDay,
    weekStartDayName: dayNames[weekStartDay],
    weekendDays,
    weekendDayNames: weekendDays.map(day => dayNames[day])
  };
};