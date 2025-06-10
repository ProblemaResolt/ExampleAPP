import React, { useState, useEffect } from 'react';
import { FaClock, FaCalendarAlt, FaChartBar, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import api from '../utils/axios';

const ProjectWorkHours = ({ projectId, isOpen }) => {
  const [workHoursData, setWorkHoursData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen && projectId) {
      fetchWorkHours();
    }
  }, [projectId, isOpen, selectedMonth, selectedYear]);
  const fetchWorkHours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/projects/${projectId}/work-hours`, {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setWorkHoursData(response.data.data);
    } catch (error) {
      console.error('勤務時間データの取得に失敗しました:', error);
      setError('勤務時間データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours) => {
    return hours ? hours.toFixed(1) : '0.0';
  };

  const formatPercentage = (percentage) => {
    return percentage ? percentage.toFixed(1) : '0.0';
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 95) return 'w3-green';
    if (rate >= 85) return 'w3-yellow';
    return 'w3-red';
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const getCurrentYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  if (!isOpen) return null;

  return (
    <div className="w3-section w3-border-top w3-padding-top">
      <h3 className="w3-text-blue">
        <FaClock className="w3-margin-right" />
        勤務時間情報
      </h3>

      {/* 期間選択 */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col l3 m6 s12">
          <label className="w3-text-grey">年</label>
          <select 
            className="w3-select w3-border" 
            value={selectedYear} 
            onChange={handleYearChange}
          >
            {getCurrentYearOptions().map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>
        <div className="w3-col l3 m6 s12">
          <label className="w3-text-grey">月</label>
          <select 
            className="w3-select w3-border" 
            value={selectedMonth} 
            onChange={handleMonthChange}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>{month}月</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="w3-center w3-padding">
          <i className="fa fa-spinner fa-spin w3-large"></i>
          <p>勤務時間データを読み込み中...</p>
        </div>
      )}

      {error && (
        <div className="w3-panel w3-red w3-leftbar w3-border-red">
          <p><FaExclamationTriangle className="w3-margin-right" />{error}</p>
        </div>
      )}

      {workHoursData && !loading && (
        <>
          {/* 期間情報 */}
          <div className="w3-panel w3-light-blue w3-leftbar w3-border-blue">
            <h4>期間: {workHoursData.period.year}年{workHoursData.period.month}月</h4>
            <p>
              <FaCalendarAlt className="w3-margin-right" />
              {workHoursData.period.startDate} ～ {workHoursData.period.endDate}
            </p>
          </div>

          {/* 全体統計 */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col l3 m6 s12">
              <div className="w3-card w3-padding w3-center w3-blue">
                <div className="w3-large">{workHoursData.summary.totalMembers}</div>
                <div>メンバー数</div>
              </div>
            </div>
            <div className="w3-col l3 m6 s12">
              <div className="w3-card w3-padding w3-center w3-green">
                <div className="w3-large">{formatHours(workHoursData.summary.totalWorkHours)}</div>
                <div>総勤務時間</div>
              </div>
            </div>
            <div className="w3-col l3 m6 s12">
              <div className="w3-card w3-padding w3-center w3-orange">
                <div className="w3-large">{formatPercentage(workHoursData.summary.averageAttendanceRate)}%</div>
                <div>平均出勤率</div>
              </div>
            </div>
            <div className="w3-col l3 m6 s12">
              <div className="w3-card w3-padding w3-center w3-red">
                <div className="w3-large">{formatHours(workHoursData.summary.totalOvertimeHours)}</div>
                <div>総残業時間</div>
              </div>
            </div>
          </div>

          {/* メンバー別勤務時間 */}
          {workHoursData.memberWorkHours && workHoursData.memberWorkHours.length > 0 ? (
            <div className="w3-margin-top">
              <h4 className="w3-text-dark-grey">
                <FaUser className="w3-margin-right" />
                メンバー別勤務時間
              </h4>
              
              <div className="w3-responsive">
                <table className="w3-table-all w3-hoverable">
                  <thead>
                    <tr className="w3-blue">
                      <th>メンバー</th>
                      <th>総勤務時間</th>
                      <th>勤務日数</th>
                      <th>出勤率</th>
                      <th>残業時間</th>
                      <th>遅刻日数</th>
                      <th>欠勤日数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workHoursData.memberWorkHours.map((member) => (
                      <tr key={member.userId}>
                        <td>
                          <div>
                            <strong>{member.name}</strong>
                          </div>
                          <div className="w3-small w3-text-grey">
                            工数: {member.allocation}%
                          </div>
                        </td>
                        <td>
                          <div className="w3-large">
                            {formatHours(member.statistics.totalWorkHours)}h
                          </div>
                          <div className="w3-small w3-text-grey">
                            期待: {formatHours(member.statistics.expectedWorkHours)}h
                          </div>
                        </td>
                        <td>
                          <div className="w3-large">
                            {member.statistics.totalWorkDays}日
                          </div>
                          <div className="w3-small w3-text-grey">
                            期待: {member.statistics.expectedWorkDays}日
                          </div>
                        </td>
                        <td>
                          <span className={`w3-tag w3-round ${getAttendanceRateColor(member.statistics.attendanceRate)}`}>
                            {formatPercentage(member.statistics.attendanceRate)}%
                          </span>
                        </td>
                        <td>
                          <div className={member.statistics.overtimeHours > 0 ? 'w3-text-red' : ''}>
                            {formatHours(member.statistics.overtimeHours)}h
                          </div>
                        </td>
                        <td>
                          <div className={member.statistics.lateDays > 0 ? 'w3-text-orange' : ''}>
                            {member.statistics.lateDays}日
                          </div>
                        </td>
                        <td>
                          <div className={member.statistics.absenceDays > 0 ? 'w3-text-red' : ''}>
                            {member.statistics.absenceDays}日
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="w3-panel w3-yellow w3-leftbar w3-border-orange">
              <p>この期間の勤務時間データがありません。</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectWorkHours;
