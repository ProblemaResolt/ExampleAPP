import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaChartBar, FaClock, FaCalendarCheck, FaExclamationTriangle, FaDownload, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const MonthlyReportDashboard = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 既存のaxiosクライアントを使用したAPI関数
  const attendanceAPI = {
    getMonthlyReport: (params) => api.get('/api/attendance/monthly-report', { params }),
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [currentDate, userId]);
  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await attendanceAPI.getMonthlyReport({
        userId,
        year,
        month
      });
      setMonthlyStats(response.data);
    } catch (error) {
      console.error('月次レポート取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    setExportLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await attendanceAPI.exportMonthlyReport(userId, year, month);
      
      // ダウンロード処理
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `勤怠レポート_${year}年${month}月.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('レポートエクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatDecimalHours = (hours) => {
    if (!hours) return '0.0';
    return hours.toFixed(1);
  };

  if (loading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <i className="fa fa-spinner fa-spin fa-3x"></i>
        <p>月次レポートを読み込み中...</p>
      </div>
    );
  }

  if (!monthlyStats) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <p>データが見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="w3-container">
      {/* ヘッダー */}
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
          <div className="w3-col s6">
            <h2 className="w3-margin-0">
              <FaChartBar className="w3-margin-right" />
              {currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })} 勤怠レポート
            </h2>
          </div>
          <div className="w3-col s2">
            <button 
              className="w3-button w3-hover-light-grey w3-round"
              onClick={() => navigateMonth(1)}
            >
              <FaChevronRight />
            </button>
          </div>
          <div className="w3-col s2">
            <button 
              className="w3-button w3-green w3-round"
              onClick={exportReport}
              disabled={exportLoading}
            >
              <FaDownload className="w3-margin-right" />
              {exportLoading ? '出力中...' : 'Excel出力'}
            </button>
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col s12 m6 l3 w3-padding-small">
          <div className="w3-card w3-blue w3-text-white w3-padding w3-center">
            <FaCalendarCheck size={30} className="w3-margin-bottom" />
            <h3 className="w3-margin-0">{monthlyStats.workDays}</h3>
            <p>出勤日数</p>
          </div>
        </div>
        
        <div className="w3-col s12 m6 l3 w3-padding-small">
          <div className="w3-card w3-green w3-text-white w3-padding w3-center">
            <FaClock size={30} className="w3-margin-bottom" />
            <h3 className="w3-margin-0">{formatDecimalHours(monthlyStats.totalWorkHours)}h</h3>
            <p>総労働時間</p>
          </div>
        </div>
        
        <div className="w3-col s12 m6 l3 w3-padding-small">
          <div className="w3-card w3-orange w3-text-white w3-padding w3-center">
            <FaExclamationTriangle size={30} className="w3-margin-bottom" />
            <h3 className="w3-margin-0">{formatDecimalHours(monthlyStats.overtimeHours)}h</h3>
            <p>残業時間</p>
          </div>
        </div>
        
        <div className="w3-col s12 m6 l3 w3-padding-small">
          <div className="w3-card w3-purple w3-text-white w3-padding w3-center">
            <FaClock size={30} className="w3-margin-bottom" />
            <h3 className="w3-margin-0">{formatDecimalHours(monthlyStats.averageWorkHours)}h</h3>
            <p>平均労働時間</p>
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col s12 m6">
          <div className="w3-card w3-white">
            <header className="w3-container w3-light-grey">
              <h4>勤怠統計</h4>
            </header>
            <div className="w3-container w3-padding">
              <table className="w3-table w3-striped">
                <tr>
                  <td>出勤日数</td>
                  <td className="w3-right-align">{monthlyStats.workDays}日</td>
                </tr>
                <tr>
                  <td>遅刻回数</td>
                  <td className="w3-right-align w3-text-red">{monthlyStats.lateCount}回</td>
                </tr>
                <tr>
                  <td>早退回数</td>
                  <td className="w3-right-align w3-text-orange">{monthlyStats.earlyLeaveCount}回</td>
                </tr>
                <tr>
                  <td>欠勤日数</td>
                  <td className="w3-right-align w3-text-red">{monthlyStats.absentDays}日</td>
                </tr>
                <tr>
                  <td>有給使用日数</td>
                  <td className="w3-right-align w3-text-blue">{monthlyStats.paidLeaveDays}日</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        
        <div className="w3-col s12 m6">
          <div className="w3-card w3-white">
            <header className="w3-container w3-light-grey">
              <h4>労働時間統計</h4>
            </header>
            <div className="w3-container w3-padding">
              <table className="w3-table w3-striped">
                <tr>
                  <td>総労働時間</td>
                  <td className="w3-right-align">{formatDecimalHours(monthlyStats.totalWorkHours)}時間</td>
                </tr>
                <tr>
                  <td>法定労働時間</td>
                  <td className="w3-right-align">{formatDecimalHours(monthlyStats.standardWorkHours)}時間</td>
                </tr>
                <tr>
                  <td>残業時間</td>
                  <td className="w3-right-align w3-text-orange">{formatDecimalHours(monthlyStats.overtimeHours)}時間</td>
                </tr>
                <tr>
                  <td>深夜残業時間</td>
                  <td className="w3-right-align w3-text-red">{formatDecimalHours(monthlyStats.nightOvertimeHours)}時間</td>
                </tr>
                <tr>
                  <td>休憩時間</td>
                  <td className="w3-right-align">{formatDecimalHours(monthlyStats.totalBreakTime)}時間</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 週別統計 */}
      {monthlyStats.weeklyStats && monthlyStats.weeklyStats.length > 0 && (
        <div className="w3-card w3-white w3-margin-bottom">
          <header className="w3-container w3-light-grey">
            <h4>週別統計</h4>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-responsive">
              <table className="w3-table w3-striped w3-bordered">
                <thead>
                  <tr className="w3-light-grey">
                    <th>週</th>
                    <th>期間</th>
                    <th>出勤日数</th>
                    <th>労働時間</th>
                    <th>残業時間</th>
                    <th>平均労働時間</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.weeklyStats.map((week, index) => (
                    <tr key={index}>
                      <td>第{index + 1}週</td>
                      <td>{week.startDate} - {week.endDate}</td>
                      <td>{week.workDays}日</td>
                      <td>{formatDecimalHours(week.totalHours)}h</td>
                      <td className={week.overtimeHours > 0 ? 'w3-text-orange' : ''}>
                        {formatDecimalHours(week.overtimeHours)}h
                      </td>
                      <td>{formatDecimalHours(week.averageHours)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* アラート・注意事項 */}
      {(monthlyStats.overtimeHours > 45 || monthlyStats.lateCount > 3 || monthlyStats.absentDays > 2) && (
        <div className="w3-card w3-pale-red w3-border-red w3-margin-bottom">
          <header className="w3-container w3-red">
            <h4>
              <FaExclamationTriangle className="w3-margin-right" />
              注意事項
            </h4>
          </header>
          <div className="w3-container w3-padding">
            <ul>
              {monthlyStats.overtimeHours > 45 && (
                <li>月間残業時間が45時間を超えています ({formatDecimalHours(monthlyStats.overtimeHours)}時間)</li>
              )}
              {monthlyStats.lateCount > 3 && (
                <li>遅刻回数が多くなっています ({monthlyStats.lateCount}回)</li>
              )}
              {monthlyStats.absentDays > 2 && (
                <li>欠勤日数が多くなっています ({monthlyStats.absentDays}日)</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 勤怠パターン分析 */}
      {monthlyStats.patterns && (
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-grey">
            <h4>勤怠パターン分析</h4>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-row">
              <div className="w3-col s12 m6">
                <h5>平均出勤時刻</h5>
                <p className="w3-large">{monthlyStats.patterns.averageClockIn}</p>
              </div>
              <div className="w3-col s12 m6">
                <h5>平均退勤時刻</h5>
                <p className="w3-large">{monthlyStats.patterns.averageClockOut}</p>
              </div>
            </div>
            
            <div className="w3-row w3-margin-top">
              <div className="w3-col s12 m6">
                <h5>最も多い出勤時刻</h5>
                <p className="w3-large">{monthlyStats.patterns.mostCommonClockIn}</p>
              </div>
              <div className="w3-col s12 m6">
                <h5>最も多い退勤時刻</h5>
                <p className="w3-large">{monthlyStats.patterns.mostCommonClockOut}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReportDashboard;
