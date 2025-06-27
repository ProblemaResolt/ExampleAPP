/**
 * スキル経験年数計算のユーティリティ関数
 */

/**
 * スキルの登録日から現在までの経験年数を計算する
 * @param {Date} createdAt - スキルの登録日
 * @param {Date} currentDate - 現在日時（デフォルトは現在時刻）
 * @returns {number} 経験年数（整数）
 */
function calculateSkillYears(createdAt, currentDate = new Date()) {
  if (!createdAt) return 0;
  
  const created = new Date(createdAt);
  const current = new Date(currentDate);
  
  // 年の差分を計算
  let years = current.getFullYear() - created.getFullYear();
  
  // 月と日を考慮した調整
  const monthDiff = current.getMonth() - created.getMonth();
  const dayDiff = current.getDate() - created.getDate();
  
  // まだその年の誕生日（登録日）を迎えていない場合は1年減らす
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--;
  }
  
  return Math.max(0, years);
}

/**
 * ユーザーのスキルデータに動的計算された経験年数を追加する
 * @param {Array} userSkills - ユーザーのスキル配列
 * @returns {Array} 経験年数が計算されたスキル配列
 */
function enrichUserSkillsWithCalculatedYears(userSkills) {
  if (!Array.isArray(userSkills)) return [];
  
  return userSkills.map(skill => {
    const calculatedYears = calculateSkillYears(skill.createdAt);
    
    return {
      ...skill,
      calculatedYears, // 動的計算された経験年数
      yearsDisplay: skill.years !== null ? skill.years : calculatedYears, // 表示用（手動設定値優先）
      isAutoCalculated: skill.years === null || skill.years === undefined // 自動計算かどうか
    };
  });
}

/**
 * スキル登録時の初期経験年数を設定する
 * @param {number|null} providedYears - ユーザーが提供した経験年数
 * @param {Date} skillCreatedAt - スキル登録日
 * @returns {number|null} 設定すべき経験年数（null = 自動計算）
 */
function getInitialSkillYears(providedYears, skillCreatedAt = new Date()) {
  // ユーザーが明示的に経験年数を指定した場合はその値を使用
  if (providedYears !== null && providedYears !== undefined && providedYears >= 0) {
    return parseInt(providedYears);
  }
  
  // 指定されていない場合は null を返して自動計算に委ねる
  return null;
}

/**
 * 月単位での経験期間を取得（より詳細な計算が必要な場合）
 * @param {Date} createdAt - スキルの登録日
 * @param {Date} currentDate - 現在日時（デフォルトは現在時刻）
 * @returns {Object} { years, months, totalMonths }
 */
function calculateDetailedSkillExperience(createdAt, currentDate = new Date()) {
  if (!createdAt) return { years: 0, months: 0, totalMonths: 0 };
  
  const created = new Date(createdAt);
  const current = new Date(currentDate);
  
  let years = current.getFullYear() - created.getFullYear();
  let months = current.getMonth() - created.getMonth();
  
  if (current.getDate() < created.getDate()) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    totalMonths: Math.max(0, totalMonths)
  };
}

module.exports = {
  calculateSkillYears,
  enrichUserSkillsWithCalculatedYears,
  getInitialSkillYears,
  calculateDetailedSkillExperience
};
