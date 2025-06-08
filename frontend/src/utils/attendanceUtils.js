import { getHolidaysForYear } from '../config/holidays';

// 時間フォーマット関数
export const formatTime = (timeString) => {
  console.log('formatTime 呼び出し:', timeString);
  if (!timeString) {
    console.log('formatTime: timeStringが空です');
    return '';
  }
  try {
    // 新しいJST形式 (例: "09:00 JST") の場合
    if (timeString.includes(' JST')) {
      const timePart = timeString.split(' ')[0];
      console.log('formatTime: JST形式から時刻抽出:', timePart);
      return timePart; // HH:MM部分のみ
    }
    // 旧JST形式 (例: "2025-06-01 18:00:00+09:00") の場合、時刻部分のみを抽出
    else if (timeString.includes('+09:00')) {
      const timePart = timeString.split(' ')[1].split('+')[0];
      console.log('formatTime: 旧JST形式から時刻抽出:', timePart);
      return timePart.substring(0, 5); // HH:MM部分のみ
    } 
    // ISO文字列または通常の日付文字列の場合、JST時刻として表示
    else {
      const date = new Date(timeString);
      // JST時刻として表示（ローカルタイムゾーンで表示）
      const formatted = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo'
      });
      console.log('formatTime: JST変換結果:', formatted);
      return formatted;
    }
  } catch (error) {
    console.error('Time formatting error:', error);
    return '';
  }
};

// 月の日数と日付配列を生成
export const generateMonthDays = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const holidays = getHolidaysForYear(year);
  const days = [];

  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const date = new Date(year, month, day);
    // 時差によるずれを防ぐため、ローカル日付文字列を使用
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const isHoliday = holidays[dateString];

    days.push({
      date: day,
      dateString,
      dayOfWeek,
      isHoliday,
      holidayName: isHoliday
    });
  }

  return days;
};

// 勤務時間計算
export const calculateWorkHours = (attendance) => {
  if (!attendance?.clockIn || !attendance?.clockOut) return 0;
  
  const clockIn = new Date(attendance.clockIn);
  const clockOut = new Date(attendance.clockOut);
  const workMinutes = (clockOut - clockIn) / (1000 * 60);
  const breakMinutes = attendance.breakTime || 0;
  return Math.max(0, (workMinutes - breakMinutes) / 60);
};

// デフォルト値を設定
export const createDefaultAttendanceData = (currentDate, workSettings) => {
  const days = generateMonthDays(currentDate);
  const defaultData = {};
  
  days.forEach(day => {
    defaultData[day.dateString] = {
      clockIn: '',
      clockOut: '',
      breakTime: workSettings.breakTime || 60,
      workHours: 0,
      status: 'PENDING',
      transportationCost: workSettings.defaultTransportationCost || 0,
      note: '',
      leaveType: ''
    };
  });
  
  return defaultData;
};

// セル編集可能チェック
export const isCellEditable = (dateString, field) => {
  const targetDate = new Date(dateString);
  const today = new Date();
  
  // 基本的に過去と今日のデータは編集可能
  if (targetDate <= today) {
    return true;
  }
  
  // 未来の日付は基本的に編集不可（一部例外あり）
  if (field === 'breakTime' || field === 'transportationCost') {
    return false; // 未来の休憩時間や交通費は編集不可
  }
  
  return false;
};

// フィールドラベル
export const fieldLabels = {
  clockIn: '出勤時刻',
  clockOut: '退勤時刻',
  breakTime: '休憩時間',
  workReport: '業務レポート',
  transportationCost: '交通費'
};
