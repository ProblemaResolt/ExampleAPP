import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaChevronLeft, FaChevronRight, FaClock, FaCoffee, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AttendanceCalendar = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  // 既存のaxiosクライアントを使用したAPI関数
  const attendanceAPI = {
    getEntries: (params) => api.get('/attendance/entries', { params }),
    getMonthlyData: ({ userId, year, month }) => 
      api.get(`/attendance/monthly/${year}/${month}`, { 
        params: { userId } 
      }),
  };

  useEffect(() => {
    fetchMonthlyAttendance();
  }, [currentDate, userId]);
  const fetchMonthlyAttendance = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // 月次勤怠データAPIを使用（有給情報も含む）
      const response = await attendanceAPI.getMonthlyData({
        userId,
        year,
        month
      });
      
      const dataMap = {};
      if (response.data?.attendanceData) {
        Object.entries(response.data.attendanceData).forEach(([dateString, data]) => {
          dataMap[dateString] = data;
        });
      }
      
      setAttendanceData(dataMap);
    } catch (error) {
      console.error('月次勤怠データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // 前月の日付で埋める
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // 次月の日付で埋める
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };
  const getAttendanceStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const entry = attendanceData[dateStr];
    
    if (!entry) return 'absent';
    if (entry.isApprovedLeave) return 'leave';
    if (entry.clockOut) return 'present';
    if (entry.clockIn) return 'working';
    return 'absent';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'w3-green';
      case 'working': return 'w3-blue';
      case 'leave': return 'w3-grey';
      case 'absent': return 'w3-red';
      default: return 'w3-light-grey';
    }
  };

  const getWorkDuration = (entry) => {
    if (!entry || !entry.clockIn) return '';
    
    const clockIn = new Date(entry.clockIn);
    const clockOut = entry.clockOut ? new Date(entry.clockOut) : new Date();
    const duration = Math.floor((clockOut - clockIn) / (1000 * 60 * 60));
    
    return `${duration}h`;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDateClick = (date, entry) => {
    if (!entry) return;
    setSelectedDate({ date, entry });
  };  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // 新しいJST形式 (例: "09:00 JST") の場合
      if (timeString.includes(' JST')) {
        return timeString.split(' ')[0]; // HH:MM部分のみ
      }
      // 旧JST形式 (例: "2025-06-01 18:00:00+09:00") の場合、時刻部分のみを抽出
      else if (timeString.includes('+09:00')) {
        const timePart = timeString.split(' ')[1].split('+')[0];
        return timePart.substring(0, 5); // HH:MM部分のみ
      } 
      // ISO文字列または通常の日付文字列の場合、JST時刻として表示
      else {
        return new Date(timeString).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Tokyo'
        });
      }
    } catch (error) {
      console.error('Time formatting error:', error);
      return '';
    }
  };

  const days = getDaysInMonth();

  return (
    <div className="w3-container">
      {/* カレンダーヘッダー */}
      <div className="w3-card w3-white w3-padding w3-margin-bottom">
        <div className="w3-row w3-center">
          <div className="w3-col s2">
            <button 
              className="w3-button w3-hover-light-grey w3-round"
              onClick={() => navigateMonth(-1)}
            >
              <FaChevronLeft />
            </button>
          </div>
          <div className="w3-col s8">
            <h3 className="w3-margin-0">
              {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
            </h3>
          </div>
          <div className="w3-col s2">
            <button 
              className="w3-button w3-hover-light-grey w3-round"
              onClick={() => navigateMonth(1)}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>      {/* カレンダーグリッド */}
      <div className="w3-card w3-white">
        {/* 曜日ヘッダー */}
        <div className="w3-row w3-light-grey w3-center">
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} className="w3-col w3-padding-small" style={{ width: '14.28%' }}>
              <strong>{day}</strong>
            </div>
          ))}
        </div>

        {/* カレンダー本体 */}
        {loading ? (
          <div className="w3-center w3-padding-large">
            <i className="fa fa-spinner fa-spin"></i> 読み込み中...
          </div>
        ) : (
          Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
            <div key={weekIndex} className="w3-row">
              {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {                const dateStr = day.date.toISOString().split('T')[0];
                const entry = attendanceData[dateStr];
                const status = getAttendanceStatus(day.date);
                
                // JST基準で今日の日付を判定
                const today = new Date();
                const jstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
                const todayStr = jstToday.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                
                return (
                  <div
                    key={dayIndex}
                    className={`w3-col w3-border ${
                      day.isCurrentMonth ? 'w3-white' : 'w3-light-grey'
                    } ${isToday ? 'w3-pale-blue' : ''}`}
                    style={{ width: '14.28%', minHeight: '100px', cursor: entry ? 'pointer' : 'default' }}
                    onClick={() => handleDateClick(day.date, entry)}
                  >                    <div className="w3-padding-small">
                      <div className="w3-row">
                        <div className="w3-col" style={{ width: '66.67%' }}>
                          <span className={`${day.isCurrentMonth ? '' : 'w3-text-grey'} ${isToday ? 'w3-text-blue' : ''}`}>
                            {day.date.getDate()}
                          </span>
                        </div>                        <div className="w3-col w3-right-align" style={{ width: '33.33%' }}>
                          {entry && (
                            <span className={`w3-badge w3-small ${getStatusColor(status)}`}>
                              {status === 'present' ? <FaCheckCircle /> : 
                               status === 'working' ? <FaClock /> : 
                               status === 'leave' ? '有' :
                               <FaTimesCircle />}
                            </span>
                          )}
                        </div>
                      </div>
                      {entry && (                        <div className="w3-small w3-text-grey w3-margin-top">
                          {entry.isApprovedLeave ? (
                            <div className="w3-text-center" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                              <div>🏖️ {entry.leaveType === 'PAID_LEAVE' ? '有給休暇' : 
                                     entry.leaveType === 'SICK_LEAVE' ? '病気休暇' :
                                     entry.leaveType === 'PERSONAL_LEAVE' ? '私用休暇' : 
                                     '休暇'}</div>
                              <div className="w3-tiny" style={{ color: '#2E7D32' }}>✅ 承認済み</div>
                            </div>
                          ) : (
                            <>
                              <div>出勤: {formatTime(entry.clockIn)}</div>
                              {entry.clockOut && (
                                <div>退勤: {formatTime(entry.clockOut)}</div>
                              )}
                              <div>{getWorkDuration(entry)}</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedDate && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '500px' }}>
            <header className="w3-container w3-blue">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setSelectedDate(null)}
              >
                ×
              </span>
              <h2>勤怠詳細</h2>
            </header>
            <div className="w3-container w3-padding">
              <h4>{selectedDate.date.toLocaleDateString('ja-JP')}</h4>
              
              <div className="w3-margin-bottom">
                <label className="w3-text-grey">出勤時刻:</label>
                <p>{formatTime(selectedDate.entry.clockIn)}</p>
              </div>
              
              {selectedDate.entry.clockOut && (
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">退勤時刻:</label>
                  <p>{formatTime(selectedDate.entry.clockOut)}</p>
                </div>
              )}
              
              <div className="w3-margin-bottom">
                <label className="w3-text-grey">勤務時間:</label>
                <p>{getWorkDuration(selectedDate.entry)}</p>
              </div>
              
              {selectedDate.entry.breaks && selectedDate.entry.breaks.length > 0 && (
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">休憩:</label>
                  {selectedDate.entry.breaks.map((breakEntry, index) => (
                    <p key={index} className="w3-small">
                      <FaCoffee className="w3-margin-right" />
                      {formatTime(breakEntry.startTime)} - {formatTime(breakEntry.endTime)}
                      ({breakEntry.type === 'LUNCH' ? '昼休憩' : '小休憩'})
                    </p>
                  ))}
                </div>
              )}
              
              {selectedDate.entry.workSummary && (
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">業務概要:</label>
                  <p className="w3-small">{selectedDate.entry.workSummary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ステータス凡例 */}      <div className="w3-card w3-white w3-margin-top w3-padding">
        <h5>ステータス凡例</h5>
        <div className="w3-row">
          <div className="w3-col s3">
            <span className="w3-badge w3-green w3-margin-right"><FaCheckCircle /></span>
            出勤済み
          </div>
          <div className="w3-col s3">
            <span className="w3-badge w3-blue w3-margin-right"><FaClock /></span>
            勤務中
          </div>
          <div className="w3-col s3">
            <span className="w3-badge w3-grey w3-margin-right">有</span>
            承認済み有給
          </div>
          <div className="w3-col s3">
            <span className="w3-badge w3-red w3-margin-right"><FaTimesCircle /></span>
            欠勤
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
