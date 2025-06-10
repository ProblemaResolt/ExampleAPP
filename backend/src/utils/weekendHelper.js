const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings } = require('./workSettings');

const prisma = new PrismaClient();

/**
 * 週末判定（プロジェクト設定に基づく）
 * @param {Date} date - 判定対象の日付
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>} 週末の場合true
 */
async function isWeekendDay(date, userId) {
  try {
    const dayOfWeek = date.getDay();
    
    // プロジェクト勤務設定を取得
    const workSettings = await getEffectiveWorkSettings(userId, date, date);
    
    if (workSettings?.projectWorkSettings?.weekStartDay !== undefined) {
      const weekStartDay = workSettings.projectWorkSettings.weekStartDay;
      
      // 週開始日から週末を計算
      const weekendDays = calculateWeekendDays(weekStartDay);
      const isWeekend = weekendDays.includes(dayOfWeek);
      
      return isWeekend;
    }
    
    // デフォルト設定（土日を週末とする）
    const isDefaultWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isDefaultWeekend;
    
  } catch (error) {
    console.error('Error determining weekend status:', error);
    // エラー時はデフォルト設定を使用
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
}

/**
 * 週開始日から週末曜日を計算
 * @param {number} weekStartDay - 週開始日（0=日曜, 1=月曜...6=土曜）
 * @returns {Array} 週末曜日の配列
 */
function calculateWeekendDays(weekStartDay) {
  // 週開始日の前2日間を週末とする
  const firstWeekendDay = (weekStartDay - 2 + 7) % 7;
  const secondWeekendDay = (weekStartDay - 1 + 7) % 7;
  
  return [firstWeekendDay, secondWeekendDay];
}

/**
 * 複数ユーザーの週末判定をバッチ処理
 * @param {Date} date - 判定対象の日付
 * @param {Array} userIds - ユーザーIDの配列
 * @returns {Promise<Object>} ユーザーIDをキーとした週末判定結果
 */
async function batchCheckWeekendDays(date, userIds) {
  const results = {};
  
  for (const userId of userIds) {
    results[userId] = await isWeekendDay(date, userId);
  }
  
  return results;
}

/**
 * デバッグ用：ユーザーの週末設定を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} 週末設定の詳細
 */
async function getWeekendSettings(userId) {
  try {
    const currentDate = new Date();
    const workSettings = await getEffectiveWorkSettings(userId, currentDate, currentDate);
    
    const weekStartDay = workSettings?.projectWorkSettings?.weekStartDay || 1;
    const weekendDays = calculateWeekendDays(weekStartDay);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    return {
      userId,
      weekStartDay,
      weekStartDayName: dayNames[weekStartDay],
      weekendDays,
      weekendDayNames: weekendDays.map(day => dayNames[day]),
      projectSettings: workSettings?.projectWorkSettings || null,
      settingSource: workSettings?.effective?.settingSource || 'default'
    };
  } catch (error) {
    console.error('Error getting weekend settings:', error);
    return null;
  }
}

module.exports = {
  isWeekendDay,
  calculateWeekendDays,
  batchCheckWeekendDays,
  getWeekendSettings
};