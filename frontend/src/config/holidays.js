// 日本の祝日設定
// 各年の祝日データを管理し、動的に取得できるようにする

// 固定日祝日（年ごとに日付が変わらない祝日）
const FIXED_HOLIDAYS = {
  '01-01': '元日',
  '02-11': '建国記念の日',
  '02-23': '天皇誕生日',
  '04-29': '昭和の日',
  '05-03': '憲法記念日',
  '05-04': 'みどりの日',
  '05-05': 'こどもの日',
  '08-11': '山の日',
  '11-03': '文化の日',
  '11-23': '勤労感謝の日'
};

// 移動祝日の計算ロジック
const calculateMovingHolidays = (year) => {
  const holidays = {};
  
  // 成人の日（1月の第2月曜日）
  const secondMondayJan = getSecondMondayOfMonth(year, 0); // 0 = January
  holidays[formatDate(secondMondayJan)] = '成人の日';
  
  // 海の日（7月の第3月曜日）
  const thirdMondayJul = getThirdMondayOfMonth(year, 6); // 6 = July
  holidays[formatDate(thirdMondayJul)] = '海の日';
  
  // 敬老の日（9月の第3月曜日）
  const thirdMondaySep = getThirdMondayOfMonth(year, 8); // 8 = September
  holidays[formatDate(thirdMondaySep)] = '敬老の日';
  
  // スポーツの日（10月の第2月曜日）
  const secondMondayOct = getSecondMondayOfMonth(year, 9); // 9 = October
  holidays[formatDate(secondMondayOct)] = 'スポーツの日';
  
  // 春分の日と秋分の日の計算
  const vernalEquinox = calculateVernalEquinox(year);
  const autumnalEquinox = calculateAutumnalEquinox(year);
  
  holidays[formatDate(new Date(year, 2, vernalEquinox))] = '春分の日'; // 2 = March
  holidays[formatDate(new Date(year, 8, autumnalEquinox))] = '秋分の日'; // 8 = September
  
  return holidays;
};

// 指定月の第2月曜日を取得
const getSecondMondayOfMonth = (year, month) => {
  let date = new Date(year, month, 1);
  let mondayCount = 0;
  
  while (mondayCount < 2) {
    if (date.getDay() === 1) { // 1 = Monday
      mondayCount++;
      if (mondayCount === 2) {
        return date;
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return date;
};

// 指定月の第3月曜日を取得
const getThirdMondayOfMonth = (year, month) => {
  let date = new Date(year, month, 1);
  let mondayCount = 0;
  
  while (mondayCount < 3) {
    if (date.getDay() === 1) { // 1 = Monday
      mondayCount++;
      if (mondayCount === 3) {
        return date;
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return date;
};

// 春分の日計算（近似式）
const calculateVernalEquinox = (year) => {
  // 春分の日の近似計算式
  let day;
  if (year >= 1851 && year <= 1899) {
    day = Math.floor(19.8277 + 0.2422 * (year - 1851) - Math.floor((year - 1851) / 4));
  } else if (year >= 1900 && year <= 1979) {
    day = Math.floor(21.124 + 0.2422 * (year - 1900) - Math.floor((year - 1900) / 4));
  } else if (year >= 1980 && year <= 2099) {
    day = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  } else if (year >= 2100 && year <= 2150) {
    day = Math.floor(21.8510 + 0.242194 * (year - 2100) - Math.floor((year - 2100) / 4));
  } else {
    day = 20; // デフォルト値
  }
  return day;
};

// 秋分の日計算（近似式）
const calculateAutumnalEquinox = (year) => {
  // 秋分の日の近似計算式
  let day;
  if (year >= 1851 && year <= 1899) {
    day = Math.floor(22.7020 + 0.2422 * (year - 1851) - Math.floor((year - 1851) / 4));
  } else if (year >= 1900 && year <= 1979) {
    day = Math.floor(23.2488 + 0.2422 * (year - 1900) - Math.floor((year - 1900) / 4));
  } else if (year >= 1980 && year <= 2099) {
    day = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  } else if (year >= 2100 && year <= 2150) {
    day = Math.floor(24.2488 + 0.242194 * (year - 2100) - Math.floor((year - 2100) / 4));
  } else {
    day = 23; // デフォルト値
  }
  return day;
};

// 日付を YYYY-MM-DD 形式でフォーマット
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// 指定年の全祝日を取得
export const getHolidaysForYear = (year) => {
  const holidays = {};
  
  // 固定祝日を追加
  Object.entries(FIXED_HOLIDAYS).forEach(([monthDay, name]) => {
    holidays[`${year}-${monthDay}`] = name;
  });
  
  // 移動祝日を追加
  const movingHolidays = calculateMovingHolidays(year);
  Object.assign(holidays, movingHolidays);
  
  return holidays;
};

// 特定の日付が祝日かどうかチェック
export const isHoliday = (dateString) => {
  const year = new Date(dateString).getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays[dateString] || null;
};

// 祝日名を取得
export const getHolidayName = (dateString) => {
  return isHoliday(dateString);
};

// デフォルトエクスポート
export default {
  getHolidaysForYear,
  isHoliday,
  getHolidayName
};
