import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  FaProjectDiagram
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error] = useState('');

  // 役割別統計データ取得
  const fetchRoleBasedStats = async () => {
    try {
      const userRole = user?.role;
      
      switch (userRole) {
        case 'ADMIN':
          const adminResponse = await api.get('/api/admin/stats');
          return adminResponse.data;
        case 'COMPANY':
          const companyResponse = await api.get('/api/companies/my-stats');
          return companyResponse.data;
        case 'MANAGER':
          const managerResponse = await api.get('/api/projects/manager-stats');
          return managerResponse.data;
        case 'MEMBER':
          const memberResponse = await api.get('/api/users/my-stats');
          return memberResponse.data;
        default:
          return {};
      }
    } catch (e) {
      console.error("fetchRoleBasedStats error:", e);
      throw e;
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const userRole = user?.role;
      let endpoint = '/api/activities/recent';
      
      // 役割に応じてエンドポイントを調整
      if (userRole === 'COMPANY') {
        endpoint = '/api/activities/company';
      } else if (userRole === 'MANAGER') {
        endpoint = '/api/activities/team';
      } else if (userRole === 'MEMBER') {
        endpoint = '/api/activities/my';
      }
      
      const response = await api.get(endpoint);
      return response.data;
    } catch (e) {
      console.error("fetchRecentActivities error:", e);
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
      <h2>ダッシュボード</h2>

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}      <div className="w3-row-padding">
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
    </div>
  );
};

export default Dashboard; 