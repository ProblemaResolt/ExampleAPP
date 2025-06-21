import React from 'react';
import { 
  FaChartBar, 
  FaChartPie, 
  FaChartLine, 
  FaUsers, 
  FaExclamationTriangle 
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/axios';
import Loading from '../common/Loading';
import ErrorMessage from '../common/ErrorMessage';

/**
 * 勤務統計チャートコンポーネント
 * @param {string} userRole - ユーザーロール
 */
const AttendanceStatsChart = ({ userRole }) => {
  const { data: attendanceStats, isLoading, error } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: async () => {
      const response = await api.get('/attendance/company-stats?period=month');
      return response.data;
    },
    enabled: userRole === 'COMPANY' || userRole === 'MANAGER'
  });

  if (!['COMPANY', 'MANAGER'].includes(userRole)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w3-card-4">
        <div className="w3-container">
          <h3><FaChartBar className="w3-margin-right" />勤務統計</h3>
          <Loading message="勤務統計を読み込み中..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w3-card-4">
        <div className="w3-container">
          <h3><FaChartBar className="w3-margin-right" />勤務統計</h3>
          <ErrorMessage 
            error={error} 
            title="勤務統計の取得に失敗しました"
          />
        </div>
      </div>
    );
  }

  const stats = attendanceStats?.data || {};
  const overview = stats.overview || {};
  const workHours = stats.workHours || {};
  const employeeStats = stats.employeeStats || [];

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3><FaChartBar className="w3-margin-right" />勤務統計（過去1ヶ月）</h3>
        
        <div className="w3-row-padding w3-margin-top">
          {/* 承認状況サマリー */}
          <div className="w3-col m6">
            <ApprovalStatusChart overview={overview} />
          </div>

          {/* 勤務時間統計 */}
          <div className="w3-col m6">
            <WorkHoursStats workHours={workHours} />
          </div>
        </div>

        {/* 社員別統計 */}
        {employeeStats.length > 0 && (
          <EmployeeStatsTable employeeStats={employeeStats} />
        )}

        {/* 承認待ち件数が多い場合の警告 */}
        {overview.pendingRecords > 10 && (
          <PendingWarning pendingCount={overview.pendingRecords} />
        )}
      </div>
    </div>
  );
};

/**
 * 承認状況チャートコンポーネント
 */
const ApprovalStatusChart = ({ overview }) => {
  const approvalData = [
    { label: '承認済み', value: overview.approvedRecords || 0, color: 'green' },
    { label: '承認待ち', value: overview.pendingRecords || 0, color: 'orange' },
    { label: '却下', value: overview.rejectedRecords || 0, color: 'red' }
  ];

  const totalRecords = overview.totalRecords || 0;

  return (
    <>
      <h4><FaChartPie className="w3-margin-right" />承認状況</h4>
      <div className="w3-container">
        {approvalData.map((item, index) => (
          <div key={index} className="w3-margin-bottom">
            <div className="w3-row">
              <div className="w3-col s8">
                <span className={`w3-tag w3-${item.color} w3-margin-right`}></span>
                {item.label}: {item.value}件
              </div>
              <div className="w3-col s4 w3-right-align">
                {totalRecords > 0 ? ((item.value / totalRecords) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="w3-light-gray w3-round">
              <div 
                className={`w3-container w3-${item.color} w3-round`} 
                style={{ 
                  width: totalRecords > 0 ? `${(item.value / totalRecords) * 100}%` : '0%',
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
    </>
  );
};

/**
 * 勤務時間統計コンポーネント
 */
const WorkHoursStats = ({ workHours }) => {
  return (
    <>
      <h4><FaChartLine className="w3-margin-right" />勤務時間統計</h4>
      <div className="w3-container">
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
    </>
  );
};

/**
 * 社員別統計テーブルコンポーネント
 */
const EmployeeStatsTable = ({ employeeStats }) => {
  return (
    <div className="w3-margin-top">
      <h4><FaUsers className="w3-margin-right" />社員別勤務統計（上位5名）</h4>
      <div className="w3-responsive">
        <table className="w3-table-all">
          <thead>
            <tr className="w3-blue">
              <th>社員名</th>
              <th>記録数</th>
              <th>総勤務時間</th>
              <th>平均勤務時間</th>
            </tr>
          </thead>
          <tbody>
            {employeeStats
              .sort((a, b) => (b._sum.workHours || 0) - (a._sum.workHours || 0))
              .slice(0, 5)
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
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * 承認待ち警告コンポーネント
 */
const PendingWarning = ({ pendingCount }) => {
  return (
    <div className="w3-panel w3-yellow w3-margin-top">
      <h4><FaExclamationTriangle className="w3-margin-right" />注意</h4>
      <p>承認待ちの勤怠記録が{pendingCount}件あります。速やかに確認・承認を行ってください。</p>
      <button 
        className="w3-button w3-blue"
        onClick={() => window.location.href = '/attendance-approval'}
      >
        勤怠承認画面へ
      </button>
    </div>
  );
};

export default AttendanceStatsChart;
