import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import { 
  FaClock, FaCalendarAlt, FaDownload, FaCheck, FaTimes, FaCog, 
  FaChevronLeft, FaChevronRight, FaEdit, FaTable, FaChartBar, 
  FaCalendarCheck, FaSyncAlt, FaBug, FaUsers 
} from 'react-icons/fa';
import LeaveManagement from '../components/LeaveManagement';
import ExcelExportForm from '../components/ExcelExportForm';
import WorkReportModal from '../components/WorkReportModal';
import AttendanceEditModal from '../components/AttendanceEditModal';
import BulkSettingsModal from '../components/BulkSettingsModal';
import WorkSettingsManagement from '../components/WorkSettingsManagement';
import { getHolidaysForYear, isHoliday } from '../config/holidays';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'leave', 'settings'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [workSettings, setWorkSettings] = useState({
    standardHours: 8,
    breakTime: 60,
    overtimeThreshold: 480,
    defaultTransportationCost: 0,
    timeInterval: 15
  });
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showWorkReport, setShowWorkReport] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editModalConfig, setEditModalConfig] = useState({ show: false });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({
    workDays: 0,
    totalHours: 0,
    overtimeHours: 0,
    leaveDays: 0,
    lateCount: 0,
    transportationCost: 0
  });

  // 現在表示中の年の祝日データを動的に取得
  const holidays = getHolidaysForYear(currentDate.getFullYear());  // 時間フォーマット関数
  const formatTime = (timeString) => {
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
  // API関数
  const attendanceAPI = {
    getMonthlyData: (year, month) => api.get(`/api/attendance/monthly/${year}/${month}?t=${Date.now()}`),
    updateAttendance: (data) => api.post('/api/attendance/update', data),
    updateWorkReport: (data) => api.post('/api/attendance/work-report', data),
    getWorkSettings: () => api.get('/api/attendance/work-settings'),
    updateWorkSettings: (data) => api.post('/api/attendance/work-settings', data),
    exportToExcel: (year, month) => api.get(`/api/attendance/export/${year}/${month}`, { responseType: 'blob' }),
    approveLeave: (leaveId) => api.patch(`/api/attendance/approve-leave/${leaveId}`),
    rejectLeave: (leaveId) => api.patch(`/api/attendance/reject-leave/${leaveId}`)
  };

  // 月次データ取得
  useEffect(() => {
    fetchMonthlyData();
    fetchWorkSettings();
  }, [currentDate]);  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await attendanceAPI.getMonthlyData(year, month);
      
      console.log('月次データ取得:', response.data);
      console.log('attendanceData詳細:', response.data.data?.attendanceData);
      console.log('キー一覧:', Object.keys(response.data.data?.attendanceData || {}));
      console.log('6月1日のデータ:', response.data.data?.attendanceData?.['2025-06-01']);
      console.log('6月2日のデータ:', response.data.data?.attendanceData?.['2025-06-02']);
      
      // レスポンス構造に合わせて修正
      setAttendanceData(response.data.data?.attendanceData || {});
      setMonthlyStats(response.data.data?.monthlyStats || {});
    } catch (error) {
      console.error('月次データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkSettings = async () => {
    try {
      const response = await attendanceAPI.getWorkSettings();
      setWorkSettings(response.data);
    } catch (error) {
      console.error('勤務設定の取得に失敗しました:', error);
    }
  };

  // 月の日数と日付配列を生成
  const generateMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
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
  const calculateWorkHours = (attendance) => {
    if (!attendance?.clockIn || !attendance?.clockOut) return 0;
    
    const clockIn = new Date(attendance.clockIn);
    const clockOut = new Date(attendance.clockOut);
    const workMinutes = (clockOut - clockIn) / (1000 * 60);
    const breakMinutes = attendance.breakTime || 0;
    return Math.max(0, (workMinutes - breakMinutes) / 60);
  };

  // デフォルト値を設定
  const setDefaultValues = () => {
    const days = generateMonthDays();
    const defaultData = {};
    
    days.forEach(day => {
      if (!attendanceData[day.dateString]) {
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
      }
    });
    
    setAttendanceData(prev => ({ ...prev, ...defaultData }));
  };

  // 前の月へ移動
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  // 次の月へ移動
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // フィールドごとの編集権限チェック
  const fieldLabels = {
    clockIn: '出勤時刻',
    clockOut: '退勤時刻',
    breakTime: '休憩時間',
    workReport: '業務レポート',
    transportationCost: '交通費'
  };

  // セル編集可能チェック
  const isCellEditable = (dateString, field) => {
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

  // 編集モーダルを開く
  const openEditModal = (dateString, field, currentValue) => {
    console.log('Opening modal:', { dateString, field, currentValue });
    setEditModalConfig({
      show: true,
      dateString,
      field,
      currentValue,
      label: fieldLabels[field] || field
    });
  };

  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setEditModalConfig({ show: false });
  };

  // 勤怠データ保存
  const saveAttendanceData = async (newValue) => {
    try {
      console.log('Saving modal data:', { newValue, editModalConfig });
      const { dateString, field } = editModalConfig;
      
      const updateData = { 
        date: dateString,
        [field]: newValue 
      };

      const response = await attendanceAPI.updateAttendance(updateData);
      
      if (response.status === 200) {
        // 月次データを再取得して更新
        await fetchMonthlyData();
        closeEditModal();
      }
    } catch (error) {
      console.error('勤怠データの保存に失敗しました:', error);
      alert('保存に失敗しました。もう一度お試しください。');
    }
  };

  // 一括設定の適用
  const applyBulkSettings = async (settings) => {
    try {
      console.log('一括設定が適用されました:', settings);
      await fetchMonthlyData();
      setShowBulkSettings(false);
    } catch (error) {
      console.error('一括設定の適用に失敗しました:', error);
      alert('一括設定の適用に失敗しました。');
    }
  };

  const monthDays = generateMonthDays();

  return (
    <div className="w3-container w3-margin-top">      {/* ヘッダー */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <header className="w3-container w3-deep-purple w3-padding">
          <h2>
            <FaClock className="w3-margin-right" />
            勤怠管理システム
          </h2>
          <p>出退勤時刻の記録と月次勤怠データの管理</p>
        </header>
      </div>

      {/* タブナビゲーション */}
      <div className="w3-bar w3-card w3-white w3-margin-bottom">
        <button
          className={`w3-bar-item w3-button ${activeTab === 'attendance' ? 'w3-blue' : 'w3-white'}`}
          onClick={() => setActiveTab('attendance')}
        >
          <FaCalendarCheck className="w3-margin-right" />
          勤怠記録
        </button>
        <button
          className={`w3-bar-item w3-button ${activeTab === 'leave' ? 'w3-blue' : 'w3-white'}`}
          onClick={() => setActiveTab('leave')}
        >
          <FaCalendarAlt className="w3-margin-right" />
          休暇管理
        </button>
        {(user?.role === 'ADMIN' || user?.role === 'COMPANY' || user?.role === 'MANAGER') && (
          <button
            className={`w3-bar-item w3-button ${activeTab === 'settings' ? 'w3-blue' : 'w3-white'}`}
            onClick={() => setActiveTab('settings')}
          >
            <FaUsers className="w3-margin-right" />
            勤務設定管理
          </button>
        )}
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'attendance' && (
        <>
          {/* 統計情報 */}
          <div className="w3-card-4 w3-white w3-margin-bottom">
            <header className="w3-container w3-blue w3-padding">
              <h3>
                <FaChartBar className="w3-margin-right" />
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 勤務統計
              </h3>
            </header>
        
        <div className="work-statistics w3-container w3-padding">
          <ul> 
            <li>
              <div className="w3-card w3-light-blue w3-padding">
                <h4>出勤日数</h4>
                <div>
                  {monthlyStats.workDays || 0}
                </div>
              </div>
            </li>
            <li>
              <div className="w3-card w3-light-green w3-padding">
                <h4>総勤務時間</h4>
                <div>
                  {Math.floor(monthlyStats.totalHours || 0)}:{Math.round(((monthlyStats.totalHours || 0) % 1) * 60).toString().padStart(2, '0')}
                </div>
              </div>
            </li>
            <li>
              <div className="w3-card w3-light-orange w3-padding">
                <h4>残業時間</h4>
                <div>
                  {Math.floor(monthlyStats.overtimeHours || 0)}:{Math.round(((monthlyStats.overtimeHours || 0) % 1) * 60).toString().padStart(2, '0')}
                </div>
              </div>
            </li>
            <li>
              <div className="w3-card w3-light-red w3-padding">
                <h4>休暇日数</h4>
                <div>
                  {monthlyStats.leaveDays || 0}
                </div>
              </div>
            </li>
            <li>
              <div className="w3-card w3-light-purple w3-padding">
                <h4>遅刻回数</h4>
                <div>
                  {monthlyStats.lateCount || 0}
                </div>
              </div>
            </li>
            <li>
              <div className="w3-card w3-light-yellow w3-padding">
                <h4>交通費</h4>
                <div>
                  ¥{(monthlyStats.transportationCost || 0).toLocaleString()}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* 月ナビゲーション */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <div className="w3-container w3-padding">
          <div className="w3-bar">
            <button 
              className="w3-bar-item w3-button w3-blue"
              onClick={goToPreviousMonth}
            >
              <FaChevronLeft /> 前月
            </button>
            
            <div className="w3-bar-item w3-center" style={{ width: '60%' }}>
              <h3>
                <FaCalendarAlt className="w3-margin-right" />
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
              </h3>
            </div>
            
            <button 
              className="w3-bar-item w3-button w3-blue"
              onClick={goToNextMonth}
            >
              次月 <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <div className="w3-container w3-padding">
          <div className="w3-bar">
            <button 
              className="w3-bar-item w3-button w3-green"
              onClick={() => setShowBulkSettings(true)}
            >
              <FaCog className="w3-margin-right" />
              一括設定
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-orange"
              onClick={() => setShowExportForm(true)}
            >
              <FaDownload className="w3-margin-right" />
              エクスポート
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-purple"
              onClick={() => setShowLeaveForm(true)}
            >
              <FaCalendarCheck className="w3-margin-right" />
              休暇申請
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-teal"
              onClick={fetchMonthlyData}
            >
              <FaSyncAlt className="w3-margin-right" />
              更新
            </button>
          </div>
        </div>
      </div>

      {/* 勤怠表 */}
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
                </tr>              ) : (
                monthDays.map(day => {
                  const attendance = attendanceData[day.dateString];
                  
                  // デバッグログ追加
                  if (day.date === 1 || day.date === 2) {
                    console.log(`=== DAY ${day.date} (${day.dateString}) DEBUG ===`);
                    console.log('attendanceData全体:', attendanceData);
                    console.log('attendance:', attendance);
                    console.log('clockIn:', attendance?.clockIn);
                    console.log('clockOut:', attendance?.clockOut);
                    console.log('===============================');
                  }
                  
                  const today = new Date();
                  const isToday = day.dateString === today.toISOString().split('T')[0];
                  const isHoliday = day.isHoliday;
                  
                  let rowClass = '';
                  if (isToday) rowClass = 'w3-light-grey';
                  else if (isHoliday) rowClass = 'w3-light-red';
                  else if (day.dayOfWeek === '土') rowClass = 'w3-light-blue';
                  else if (day.dayOfWeek === '日') rowClass = 'w3-light-red';

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
                        {isHoliday && <div className="w3-tiny w3-text-red">祝</div>}
                      </td>                      {/* 出勤時刻 */}
                      <td className="w3-center">
                        <button
                          className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                          onClick={() => openEditModal(
                            day.dateString, 
                            'clockIn', 
                            formatTime(attendance?.clockIn) || ''
                          )}
                          disabled={!isCellEditable(day.dateString, 'clockIn')}
                          style={{ minWidth: '80px' }}
                        >
                          {(() => {
                            const clockInValue = attendance?.clockIn;
                            const formattedTime = clockInValue ? formatTime(clockInValue) : '-';
                            if (day.date === 1 || day.date === 2) {
                              console.log(`ボタン表示 日付${day.date}: clockIn=${clockInValue}, formatted=${formattedTime}`);
                            }
                            return formattedTime;
                          })()}
                          <FaEdit className="w3-tiny w3-margin-left" />
                        </button>
                      </td>                      {/* 退勤時刻 */}
                      <td className="w3-center">
                        <button
                          className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                          onClick={() => openEditModal(
                            day.dateString, 
                            'clockOut', 
                            formatTime(attendance?.clockOut) || ''
                          )}
                          disabled={!isCellEditable(day.dateString, 'clockOut')}
                          style={{ minWidth: '80px' }}
                        >
                          {(() => {
                            const clockOutValue = attendance?.clockOut;
                            const formattedTime = clockOutValue ? formatTime(clockOutValue) : '-';
                            if (day.date === 1 || day.date === 2) {
                              console.log(`ボタン表示 日付${day.date}: clockOut=${clockOutValue}, formatted=${formattedTime}`);
                            }
                            return formattedTime;
                          })()}
                          <FaEdit className="w3-tiny w3-margin-left" />
                        </button>
                      </td>

                      {/* 休憩時間 */}
                      <td className="w3-center">
                        <button
                          className="w3-button w3-small w3-white w3-border w3-hover-light-grey"
                          onClick={() => openEditModal(
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
                          onClick={() => {
                            setSelectedDate(day.dateString);
                            setShowWorkReport(true);
                          }}
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
                            onClick={() => openEditModal(
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
            </tbody>          </table>
        </div>
      </div>
        </>
      )}

      {/* 休暇管理タブ */}
      {activeTab === 'leave' && (
        <div className="w3-card-4 w3-white">
          <header className="w3-container w3-green w3-padding">
            <h3>
              <FaCalendarAlt className="w3-margin-right" />
              休暇管理
            </h3>
          </header>
          <div className="w3-container w3-padding">
            <LeaveManagement
              userId={user?.id}
              userRole={user?.role}
            />
          </div>
        </div>
      )}

      {/* 勤務設定管理タブ */}
      {activeTab === 'settings' && (user?.role === 'ADMIN' || user?.role === 'COMPANY' || user?.role === 'MANAGER') && (
        <div className="w3-card-4 w3-white">
          <header className="w3-container w3-orange w3-padding">
            <h3>
              <FaUsers className="w3-margin-right" />
              勤務設定管理
            </h3>
          </header>
          <div className="w3-container w3-padding">
            <WorkSettingsManagement />
          </div>
        </div>
      )}

      {/* モーダル類 */}
      {editModalConfig.show && (
        <AttendanceEditModal
          config={editModalConfig}
          onSave={saveAttendanceData}
          onClose={closeEditModal}
          workSettings={workSettings}
        />
      )}      {showBulkSettings && (
        <BulkSettingsModal
          isOpen={showBulkSettings}
          onClose={() => setShowBulkSettings(false)}
          onSave={applyBulkSettings}
          workSettings={workSettings}
          currentMonth={currentDate.getMonth() + 1}
          currentYear={currentDate.getFullYear()}
        />
      )}      {showLeaveForm && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '900px', margin: '5% auto' }}>
            <header className="w3-container w3-indigo">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setShowLeaveForm(false)}
              >
                <FaTimes />
              </span>
              <h3>休暇申請</h3>
            </header>
            <div className="w3-container w3-padding">
              <LeaveManagement
                userId={user?.id}
                userRole={user?.role}
              />
            </div>
          </div>
        </div>
      )}

      {showWorkReport && (
        <WorkReportModal
          date={selectedDate}
          onClose={() => setShowWorkReport(false)}
          onSave={fetchMonthlyData}
        />
      )}

      {showExportForm && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px', margin: '5% auto' }}>
            <header className="w3-container w3-indigo">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setShowExportForm(false)}
              >
                <FaTimes />
              </span>
              <h3>エクスポート</h3>
            </header>
            <div className="w3-container w3-padding">
              <ExcelExportForm
                currentYear={currentDate.getFullYear()}
                currentMonth={currentDate.getMonth() + 1}
                onExport={(year, month) => {
                  console.log(`Exporting data for ${year}/${month}`);
                  // TODO: エクスポート機能の実装
                  setShowExportForm(false);
                }}
                onCancel={() => setShowExportForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
