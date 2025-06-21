import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaChartBar, FaChartPie, FaChartLine, FaUsers, FaCalendarCheck, FaClock } from 'react-icons/fa';
import api from '../utils/axios';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';

const AttendanceStatistics = () => {
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  // 勤務統計データを取得
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['attendance-statistics', filters],
    queryFn: async () => {
      const response = await api.get(`/attendance/company-stats?year=${filters.year}&month=${filters.month}`);
      return response.data;
    }
  });

  if (isLoading) {
    return <Loading message="勤務統計を読み込み中..." />;
  }

  if (error) {
    return (
      <div className="w3-container">
        <ErrorMessage 
          error={error} 
          title="勤務統計の取得に失敗しました"
        />
      </div>
    );
  }

  const stats = statsData?.data || {};
  const overview = stats.overview || {};
  const workHours = stats.workHours || {};
  const employeeStats = stats.employeeStats || [];

  return (
    <div className="w3-container">
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col m8">
          <h2><FaChartBar className="w3-margin-right" />勤務統計</h2>
        </div>
        <div className="w3-col m4 w3-right-align">
          <div className="w3-margin-bottom">
            <label>年月: </label>
            <select 
              className="w3-select w3-border w3-margin-left w3-margin-right" 
              style={{width: '80px', display: 'inline-block'}}
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select 
              className="w3-select w3-border" 
              style={{width: '70px', display: 'inline-block'}}
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: parseInt(e.target.value) }))}
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 統計カード */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-quarter">
          <div className="w3-card w3-blue w3-padding">
            <div className="w3-row">
              <div className="w3-col w3-center" style={{ width: '60px' }}>
                <FaUsers className="w3-xxlarge" />
              </div>
              <div className="w3-col">
                <h3 style={{ margin: '0' }}>{overview.totalRecords || 0}</h3>
                <p>総記録数</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w3-quarter">
          <div className="w3-card w3-green w3-padding">
            <div className="w3-row">
              <div className="w3-col w3-center" style={{ width: '60px' }}>
                <FaCalendarCheck className="w3-xxlarge" />
              </div>
              <div className="w3-col">
                <h3 style={{ margin: '0' }}>{overview.approvedRecords || 0}</h3>
                <p>承認済み</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w3-quarter">
          <div className="w3-card w3-orange w3-padding">
            <div className="w3-row">
              <div className="w3-col w3-center" style={{ width: '60px' }}>
                <FaClock className="w3-xxlarge" />
              </div>
              <div className="w3-col">
                <h3 style={{ margin: '0' }}>{overview.pendingRecords || 0}</h3>
                <p>承認待ち</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w3-quarter">
          <div className="w3-card w3-red w3-padding">
            <div className="w3-row">
              <div className="w3-col w3-center" style={{ width: '60px' }}>
                <FaChartLine className="w3-xxlarge" />
              </div>
              <div className="w3-col">
                <h3 style={{ margin: '0' }}>{overview.rejectedRecords || 0}</h3>
                <p>却下</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="w3-row w3-margin-bottom">
        {/* 承認状況 */}
        <div className="w3-col m6">
          <div className="w3-card-4">
            <header className="w3-container w3-blue">
              <h3><FaChartPie className="w3-margin-right" />承認状況</h3>
            </header>
            <div className="w3-container w3-padding">
              {[
                { label: '承認済み', value: overview.approvedRecords || 0, color: 'green' },
                { label: '承認待ち', value: overview.pendingRecords || 0, color: 'orange' },
                { label: '却下', value: overview.rejectedRecords || 0, color: 'red' }
              ].map((item, index) => (
                <div key={index} className="w3-margin-bottom">
                  <div className="w3-row">
                    <div className="w3-col s8">
                      <span className={`w3-tag w3-${item.color} w3-margin-right`}></span>
                      {item.label}: {item.value}件
                    </div>
                    <div className="w3-col s4 w3-right-align">
                      {overview.totalRecords > 0 ? ((item.value / overview.totalRecords) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="w3-light-gray w3-round">
                    <div 
                      className={`w3-container w3-${item.color} w3-round`} 
                      style={{ 
                        width: overview.totalRecords > 0 ? `${(item.value / overview.totalRecords) * 100}%` : '0%',
                        height: '20px'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
              <div className="w3-margin-top">
                <p><strong>承認率:</strong> {overview.approvalRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 勤務時間統計 */}
        <div className="w3-col m6">
          <div className="w3-card-4">
            <header className="w3-container w3-green">
              <h3><FaChartLine className="w3-margin-right" />勤務時間統計</h3>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-panel w3-pale-blue">
                <div className="w3-row-padding">
                  <div className="w3-col s6">
                    <div className="w3-center">
                      <h3 className="w3-text-blue">{workHours.totalHours || 0}</h3>
                      <p>総勤務時間</p>
                    </div>
                  </div>
                  <div className="w3-col s6">
                    <div className="w3-center">
                      <h3 className="w3-text-green">{workHours.averageHours || 0}</h3>
                      <p>平均勤務時間</p>
                    </div>
                  </div>
                </div>
                <div className="w3-center">
                  <p className="w3-small w3-text-gray">
                    対象記録数: {workHours.recordCount || 0}件
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 社員別統計 */}
      {employeeStats.length > 0 && (
        <div className="w3-card-4">
          <header className="w3-container w3-purple">
            <h3><FaUsers className="w3-margin-right" />社員別勤務統計</h3>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-responsive">
              <table className="w3-table-all w3-hoverable">
                <thead>
                  <tr className="w3-light-grey">
                    <th>社員名</th>
                    <th>記録数</th>
                    <th>総勤務時間</th>
                    <th>平均勤務時間</th>
                    <th>最高勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeStats
                    .sort((a, b) => (b._sum.workHours || 0) - (a._sum.workHours || 0))
                    .map((stat, index) => (
                      <tr key={stat.userId}>
                        <td>
                          {stat.user.lastName} {stat.user.firstName}
                          {stat.user.position && (
                            <div className="w3-small w3-text-gray">{stat.user.position}</div>
                          )}
                        </td>
                        <td>{stat._count.id}件</td>
                        <td>{(stat._sum.workHours || 0).toFixed(1)}時間</td>
                        <td>{(stat._avg.workHours || 0).toFixed(1)}時間</td>
                        <td>{(stat._max.workHours || 0).toFixed(1)}時間</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatistics;
