import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FaSpinner, 
  FaUser, 
  FaUsers,
  FaClipboardList,
  FaChartBar,
  FaCog,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaBuilding,
  FaProjectDiagram,
  FaSync,
  FaBug,
  FaChartPie,
  FaChartLine
} from 'react-icons/fa';
import api from '../utils/axios';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

// Statistics overview card for different roles
const StatsOverview = ({ data, isLoading, error, userRole }) => {
  if (isLoading) {
    return (
      <div className="w3-center w3-padding">
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="w3-panel w3-red">
        <p>{error.message}</p>
      </div>
    );
  }

  const statsData = data?.data ?? {};

  const getStatsConfig = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { key: 'totalUsers', label: '総ユーザー数', color: 'w3-text-blue', icon: FaUsers },
          { key: 'totalCompanies', label: '総会社数', color: 'w3-text-green', icon: FaBuilding },
          { key: 'totalProjects', label: '総プロジェクト数', color: 'w3-text-orange', icon: FaProjectDiagram },
          { key: 'systemAlerts', label: 'システムアラート', color: 'w3-text-red', icon: FaExclamationTriangle }
        ];
      case 'COMPANY':
        return [
          { key: 'companyEmployees', label: '社員数', color: 'w3-text-blue', icon: FaUsers },
          { key: 'companyProjects', label: 'プロジェクト数', color: 'w3-text-green', icon: FaProjectDiagram },
          { key: 'activeProjects', label: 'アクティブプロジェクト', color: 'w3-text-orange', icon: FaCheckCircle },
          { key: 'totalSkills', label: '登録スキル数', color: 'w3-text-purple', icon: FaTasks }
        ];
      case 'MANAGER':
        return [
          { key: 'managedProjects', label: '担当プロジェクト', color: 'w3-text-blue', icon: FaProjectDiagram },
          { key: 'teamMembers', label: 'チームメンバー', color: 'w3-text-green', icon: FaUsers },
          { key: 'completedTasks', label: '完了プロジェクト', color: 'w3-text-orange', icon: FaCheckCircle },
          { key: 'pendingTasks', label: '保留中プロジェクト', color: 'w3-text-red', icon: FaClock }
        ];
      case 'MEMBER':
        return [
          { key: 'myProjects', label: '参加プロジェクト', color: 'w3-text-blue', icon: FaProjectDiagram },
          { key: 'mySkills', label: '保有スキル', color: 'w3-text-green', icon: FaTasks },
          { key: 'myTasks', label: '担当プロジェクト', color: 'w3-text-orange', icon: FaClipboardList },
          { key: 'workTime', label: '今月の稼働時間', color: 'w3-text-purple', icon: FaClock }
        ];
      default:
        return [];
    }
  };

  const statsConfig = getStatsConfig();

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3>{userRole === 'ADMIN' ? 'システム統計' : userRole === 'COMPANY' ? '会社概要' : userRole === 'MANAGER' ? 'マネージャー概要' : '個人概要'}</h3>
        <div className="w3-row-padding">
          {statsConfig.map((stat, index) => (
            <div key={stat.key} className="w3-col m3">
              <div className="w3-center">
                <stat.icon className={`w3-xxlarge ${stat.color} w3-margin-bottom`} />
                <h2 className={stat.color}>{statsData[stat.key] ?? 0}</h2>
                <p className="w3-text-gray">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Recent activities card
const RecentActivities = ({ data, isLoading, error, userRole }) => {
  if (isLoading) {
    return (
      <div className="w3-center w3-padding">
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="w3-panel w3-red">
        <p>{error.message}</p>
      </div>
    );
  }

  const activities = data?.data ?? [];

  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'user':
      case 'employee':
        return <FaUser className="w3-text-blue" />;
      case 'company':
        return <FaBuilding className="w3-text-green" />;
      case 'project':
        return <FaProjectDiagram className="w3-text-orange" />;
      case 'skill':
        return <FaTasks className="w3-text-purple" />;
      case 'login':
        return <FaUser className="w3-text-blue" />;
      default:
        return <FaClipboardList className="w3-text-gray" />;
    }
  };

  const getActivityTitle = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'システムアクティビティ';
      case 'COMPANY':
        return '会社内アクティビティ';
      case 'MANAGER':
        return 'チームアクティビティ';
      case 'MEMBER':
        return '最近のアクティビティ';
      default:
        return '最近のアクティビティ';
    }
  };

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3>{getActivityTitle()}</h3>
        <ul className="w3-ul w3-hoverable">
          {activities.map((activity) => (
            <li key={activity.id} className="w3-padding-16">
              <div className="w3-cell-row">
                <div className="w3-cell" style={{ width: '40px' }}>
                  {getActivityIcon(activity)}
                </div>
                <div className="w3-cell">
                  <div>{activity.description}</div>
                  <div className="w3-small w3-text-gray">
                    {format(new Date(activity.timestamp), 'PPp')}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="w3-padding-16 w3-center w3-text-gray">
              アクティビティはありません
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// 勤務統計チャート（COMPANY向け）
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
        <div className="w3-container w3-center w3-padding">
          <FaSpinner className="fa-spin w3-xxlarge" />
          <p>勤務統計を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w3-card-4">
        <div className="w3-container">
          <h3><FaChartBar className="w3-margin-right" />勤務統計</h3>
          <div className="w3-panel w3-red">
            <p>勤務統計の取得に失敗しました: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = attendanceStats?.data || {};
  const overview = stats.overview || {};
  const workHours = stats.workHours || {};
  const employeeStats = stats.employeeStats || [];

  // 承認状況の円グラフデータ（CSS-onlyで近似表現）
  const approvalData = [
    { label: '承認済み', value: overview.approvedRecords || 0, color: 'green' },
    { label: '承認待ち', value: overview.pendingRecords || 0, color: 'orange' },
    { label: '却下', value: overview.rejectedRecords || 0, color: 'red' }
  ];

  const totalRecords = overview.totalRecords || 0;

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3><FaChartBar className="w3-margin-right" />勤務統計（過去1ヶ月）</h3>
        
        <div className="w3-row-padding w3-margin-top">
          {/* 承認状況サマリー */}
          <div className="w3-col m6">
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
          </div>

          {/* 勤務時間統計 */}
          <div className="w3-col m6">
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
          </div>
        </div>

        {/* 社員別統計（上位5名） */}
        {employeeStats.length > 0 && (
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
        )}

        {/* 承認待ち件数が多い場合の警告 */}
        {overview.pendingRecords > 10 && (
          <div className="w3-panel w3-yellow w3-margin-top">
            <h4><FaExclamationTriangle className="w3-margin-right" />注意</h4>
            <p>承認待ちの勤怠記録が{overview.pendingRecords}件あります。速やかに確認・承認を行ってください。</p>
            <button 
              className="w3-button w3-blue"
              onClick={() => window.location.href = '/attendance-approval'}
            >
              勤怠承認画面へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const queryClient = useQueryClient();

  // デバッグ用：キャッシュを無効化して強制リフレッシュ
  const forceRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
  };

  // 役割別統計データ取得（タイムスタンプでキャッシュバイパス）
  const fetchRoleBasedStats = async () => {
    try {
      const userRole = user?.role;
      const timestamp = Date.now(); // キャッシュバイパス用
      
      switch (userRole) {
        case 'ADMIN':
          const adminResponse = await api.get(`/admin/stats?t=${timestamp}`);
          return adminResponse.data;
        case 'COMPANY':
          const companyResponse = await api.get(`/companies/my-stats?t=${timestamp}`);
          return companyResponse.data;
        case 'MANAGER':
          // 管理者統計を代用
          const managerResponse = await api.get(`/admin/stats?t=${timestamp}`);
          return managerResponse.data;
        case 'MEMBER':
          // 管理者統計を代用
          const memberResponse = await api.get(`/admin/stats?t=${timestamp}`);
          return memberResponse.data;
        default:
          return {};
      }
    } catch (e) {
      throw e;
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const userRole = user?.role;
      let endpoint = '/activities/recent';
      const timestamp = Date.now(); // キャッシュバイパス用
      
      // 役割に応じてエンドポイントを調整
      if (userRole === 'COMPANY') {
        endpoint = '/activities/company';
      } else if (userRole === 'MANAGER') {
        endpoint = '/activities/team';
      } else if (userRole === 'MEMBER') {
        endpoint = '/activities/my';
      }
      
      const response = await api.get(`${endpoint}?t=${timestamp}`);
      return response.data;
    } catch (e) {
      throw e;
    }
  };

  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', user?.role],
    queryFn: fetchRoleBasedStats,
    enabled: !!user?.role
  });
  const { data: recentActivities, isLoading: isLoadingActivities, error: activitiesError } = useQuery({
    queryKey: ['recent-activities', user?.role],
    queryFn: fetchRecentActivities,
    enabled: !!user?.role
  });
  return (
    <div className="w3-container">
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col m8">
          <h2>ダッシュボード</h2>
        </div>
        <div className="w3-col m4 w3-right-align">
          {/* デバッグコントロール */}
          <button
            className="w3-button w3-small w3-border w3-margin-right"
            onClick={() => setDebugMode(!debugMode)}
            title="デバッグモードを切り替え"
          >
            <FaBug className="w3-margin-right" />
            {debugMode ? 'デバッグOFF' : 'デバッグON'}
          </button>
          <button
            className="w3-button w3-small w3-blue"
            onClick={forceRefreshData}
            title="データを強制リフレッシュ"
          >
            <FaSync className="w3-margin-right" />
            リフレッシュ
          </button>
        </div>
      </div>

      {/* デバッグ情報表示 */}
      {debugMode && (
        <div className="w3-card w3-pale-yellow w3-margin-bottom">
          <div className="w3-container w3-padding">
            <h4><FaBug className="w3-margin-right" />デバッグ情報</h4>
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <p><strong>ユーザー役割:</strong> {user?.role || 'N/A'}</p>
                <p><strong>最終取得時刻:</strong> {new Date().toLocaleString()}</p>
                <p><strong>統計データ状態:</strong> {isLoadingStats ? '読み込み中' : statsData ? '取得済み' : 'エラー'}</p>
              </div>
              <div className="w3-col m6">
                <p><strong>アクティビティ状態:</strong> {isLoadingActivities ? '読み込み中' : recentActivities ? '取得済み' : 'エラー'}</p>
                <p><strong>統計データ件数:</strong> {Object.keys(statsData?.data || {}).length}</p>
                <p><strong>アクティビティ件数:</strong> {recentActivities?.data?.length || 0}</p>
              </div>
            </div>
            {(statsError || activitiesError) && (
              <div className="w3-panel w3-red w3-margin-top">
                <h5>エラー情報:</h5>
                {statsError && <p>統計エラー: {statsError.message}</p>}
                {activitiesError && <p>アクティビティエラー: {activitiesError.message}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}<div className="w3-row-padding">
        {/* Stats Overview */}
        <div className="w3-col m8">
          <StatsOverview
            data={statsData}
            isLoading={isLoadingStats}
            error={statsError}
            userRole={user?.role}
          />
        </div>

        {/* Recent Activities */}
        <div className="w3-col m4">
          <RecentActivities
            data={recentActivities}
            isLoading={isLoadingActivities}
            error={activitiesError}
            userRole={user?.role}
          />
        </div>
      </div>

      {/* 勤務統計チャート（COMPANY/MANAGER用） */}
      {(user?.role === 'COMPANY' || user?.role === 'MANAGER') && (
        <div className="w3-margin-top">
          <AttendanceStatsChart userRole={user?.role} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;