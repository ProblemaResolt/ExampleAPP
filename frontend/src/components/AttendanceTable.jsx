// filepath: d:\dev\app\frontend\src\components\AttendanceTable.jsx
import React from 'react';
import { FaTable, FaEdit } from 'react-icons/fa';
import { getHolidaysForYear } from '../config/holidays';
import { formatTime } from '../utils/attendanceUtils';

const AttendanceTable = ({ 
  currentDate,
  attendanceData, 
  workSettings,
  loading, 
  onEditCell,
  onShowWorkReport 
}) => {
  // 月の日数と日付配列を生成
  const generateCurrentMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const holidays = getHolidaysForYear(year);
    const days = [];

    const lastDay = new Date(year, month + 1, 0);
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
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
  const monthDays = generateCurrentMonthDays();
  
  // 時間フォーマット関数（編集用 - JST時刻を HH:MM形式で返す）
  const formatTimeForEdit = (timeString) => {
    if (!timeString) return '';
    try {
      if (timeString.includes(' JST')) {
        return timeString.split(' ')[0];
      }
      if (timeString.includes('+09:00')) {
        const timePart = timeString.split(' ')[1].split('+')[0];
        return timePart.substring(0, 5);
      } 
      // UTC時間をJSTに変換してHH:MM形式で返す
      const date = new Date(timeString);
      const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      const hours = jstDate.getUTCHours().toString().padStart(2, '0');
      const minutes = jstDate.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Time formatting error:', error);
      return '';
    }
  };

  // セル編集可能チェック
  const isCellEditable = (dateString, field) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    
    if (targetDate <= today) {
      return true;
    }
    
    if (field === 'breakTime' || field === 'transportationCost') {
      return false;
    }
    
    return false;
  };

  // 行のスタイルを決定
  const getRowClass = (day) => {
    const today = new Date();
    const isToday = day.dateString === today.toISOString().split('T')[0];
    const isHoliday = day.isHoliday;
    
    if (isToday) return 'w3-light-grey';
    if (isHoliday) return 'w3-light-red';
    if (day.dayOfWeek === '日') return 'w3-light-red';
    if (day.dayOfWeek === '土') return 'w3-light-blue';
    return '';
  };

  return (
    <div className="w3-card-4 w3-white">
      <header className="w3-container w3-indigo w3-padding">
        <h3>
          <FaTable className="w3-margin-right" />
          勤怠記録表
        </h3>
      </header>
      
      <div className="w3-responsive">
        <table className="w3-table-all w3-hoverable">
          <thead>
            <tr className="w3-indigo">
              <th>日付</th>
              <th>曜日</th>
              <th>出勤時刻</th>
              <th>退勤時刻</th>
              <th>休憩時間</th>
              <th>勤務時間</th>
              <th>残業時間</th>
              <th>業務レポート</th>
              <th>交通費</th>
              <th>休暇申請</th>
              <th>承認状況</th>
              <th>顧客承認</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" className="w3-center w3-padding">
                  読み込み中...
                </td>
              </tr>
            ) : (
              monthDays.map(day => {
                const attendance = attendanceData[day.dateString];
                const rowClass = getRowClass(day);
                const today = new Date();
                const isToday = day.dateString === today.toISOString().split('T')[0];

                return (
                  <tr key={day.dateString} className={rowClass}>
                    {/* 日付 */}
                    <td className="w3-center">
                      <strong>{day.date}</strong>
                      {isToday && <div className="w3-tiny w3-text-red">今日</div>}
                    </td>
                    
                    {/* 曜日 */}
                    <td className="w3-center">
                      <span className={
                        day.dayOfWeek === '日' ? 'w3-text-red' :
                        day.dayOfWeek === '土' ? 'w3-text-blue' : ''
                      }>
                        {day.dayOfWeek}
                      </span>
                      {day.isHoliday && <div className="w3-tiny w3-text-red">祝</div>}
                    </td>                    {/* 出勤時刻 */}
                    <td className="w3-center">
                      <button
                        className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                        onClick={() => onEditCell(
                          day.dateString, 
                          'clockIn', 
                          formatTimeForEdit(attendance?.clockIn) || ''
                        )}
                        disabled={!isCellEditable(day.dateString, 'clockIn')}
                        style={{ minWidth: '80px' }}
                      >
                        {formatTime(attendance?.clockIn) || '-'}
                        <FaEdit className="w3-tiny w3-margin-left" />
                      </button>
                    </td>

                    {/* 退勤時刻 */}
                    <td className="w3-center">
                      <button
                        className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                        onClick={() => onEditCell(
                          day.dateString, 
                          'clockOut', 
                          formatTimeForEdit(attendance?.clockOut) || ''
                        )}
                        disabled={!isCellEditable(day.dateString, 'clockOut')}
                        style={{ minWidth: '80px' }}
                      >
                        {formatTime(attendance?.clockOut) || '-'}
                        <FaEdit className="w3-tiny w3-margin-left" />
                      </button>
                    </td>

                    {/* 休憩時間 */}
                    <td className="w3-center">
                      <button
                        className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                        onClick={() => onEditCell(
                          day.dateString, 
                          'breakTime', 
                          attendance?.breakTime || workSettings.breakTime || 60
                        )}
                        disabled={!isCellEditable(day.dateString, 'breakTime')}
                        style={{ minWidth: '60px' }}
                      >
                        {attendance?.breakTime || workSettings.breakTime || 60}分
                        <FaEdit className="w3-tiny w3-margin-left" />
                      </button>
                    </td>

                    {/* 勤務時間 */}
                    <td className="w3-center">
                      <span className={attendance?.clockIn && attendance?.clockOut ? 'w3-text-green' : 'w3-text-grey'}>
                        {attendance?.clockIn && attendance?.clockOut ? (
                          `${Math.floor(attendance.workHours || 0)}:${Math.round(((attendance.workHours || 0) % 1) * 60).toString().padStart(2, '0')}`
                        ) : '-'}
                      </span>
                    </td>

                    {/* 残業時間 */}
                    <td className="w3-center">
                      <span className={
                        (attendance?.workHours || 0) > 8 ? 'w3-text-red' : 'w3-text-grey'
                      }>
                        {(attendance?.workHours || 0) > 8 ? 
                          `${Math.floor(Math.max(0, (attendance.workHours || 0) - 8))}:${Math.round((Math.max(0, (attendance.workHours || 0) - 8) % 1) * 60).toString().padStart(2, '0')}` : 
                          '-'
                        }
                      </span>
                    </td>

                    {/* 業務レポート */}
                    <td className="w3-center">
                      <button
                        className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                        onClick={() => onShowWorkReport(day.dateString)}
                        style={{ minWidth: '80px' }}
                      >
                        <FaEdit />
                        {attendance?.note ? ' 入力済' : ' 未入力'}
                      </button>
                    </td>

                    {/* 交通費 */}
                    <td className="w3-center">
                      {attendance?.clockIn ? (
                        <button
                          className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                          onClick={() => onEditCell(
                            day.dateString, 
                            'transportationCost', 
                            attendance?.transportationCost || workSettings.defaultTransportationCost || 0
                          )}
                          disabled={!isCellEditable(day.dateString, 'transportationCost')}
                          style={{ minWidth: '80px' }}
                        >
                          ¥{((attendance?.transportationCost !== undefined ? attendance.transportationCost : workSettings.defaultTransportationCost) || 0).toLocaleString()}
                          <FaEdit className="w3-tiny w3-margin-left" />
                        </button>
                      ) : (
                        <span className="w3-text-light-grey">-</span>
                      )}
                    </td>
                    
                    {/* 休暇申請 */}
                    <td className="w3-center">
                      {attendance?.leaveType ? (
                        <span className="w3-tag w3-blue">{attendance.leaveType}</span>
                      ) : (
                        <span className="w3-text-grey">-</span>
                      )}
                    </td>

                    {/* 承認状況 */}
                    <td className="w3-center">
                      <span className={
                        attendance?.status === 'APPROVED' ? 'w3-text-green' :
                        attendance?.status === 'REJECTED' ? 'w3-text-red' :
                        'w3-text-orange'
                      }>
                        {attendance?.status === 'APPROVED' ? '承認済' :
                         attendance?.status === 'REJECTED' ? '拒否' :
                         '未承認'}
                      </span>
                    </td>

                    {/* 顧客承認 */}
                    <td className="w3-center">
                      <span className="w3-text-grey">-</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
