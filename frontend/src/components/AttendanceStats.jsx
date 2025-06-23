import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FaChartBar, 
  FaUsers, 
  FaClock, 
  FaCalendarCheck, 
  FaExclamationTriangle,
  FaDollarSign,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import Loading from './common/Loading';
import ErrorMessage from './common/ErrorMessage';
import StatsCard from './common/StatsCard';
import DataTable from './common/DataTable';
import StatsGrid from './common/StatsGrid';
import Filter from './common/Filter';
import '../styles/AttendanceStats.css';

const AttendanceStats = ({ currentDate }) => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState('');
  
  // ユーザーの役割に応じたデータを取得
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['attendance-stats', currentDate.getFullYear(), currentDate.getMonth() + 1, selectedProject, user?.id],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      if (user?.role === 'MEMBER') {
        // メンバーは自分のデータのみ
        const response = await api.get(`/attendance/user-stats/${user.id}?year=${year}&month=${month}`);
        return response.data;
      } else {
        // Company/Managerは関連メンバーのデータ
        const projectParam = selectedProject ? `&projectId=${selectedProject}` : '';
        const response = await api.get(`/attendance/team-stats?year=${year}&month=${month}${projectParam}`);
        return response.data;
      }
    },
    enabled: !!user
  });

  // プロジェクト一覧取得（Manager/Company用）
  const { data: projectsData } = useQuery({
    queryKey: ['user-projects', user?.id],
    queryFn: async () => {
      if (user?.role === 'MEMBER') return null;
      const response = await api.get('/projects/my-projects');
      return response.data;
    },
    enabled: !!user && user?.role !== 'MEMBER'
  });

  if (isLoading) {
    return <Loading message="勤務統計を読み込み中..." />;
  }

  if (error) {
    return <ErrorMessage error={error} title="勤務統計の取得に失敗しました" />;
  }

  const stats = statsData?.data || {};
  const projects = projectsData?.data || [];

  // メンバー用の個人統計表示
  if (user?.role === 'MEMBER') {
    return (
      <div className="w3-white w3-margin-bottom w3-card-4">
        <header className="w3-container w3-gradient-blue w3-padding-16">
          <h3 className="w3-text-white">
            <FaUser className="w3-margin-right" />
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 勤務統計
          </h3>
          <p className="w3-text-white w3-opacity">個人の勤務実績サマリー</p>
        </header>
        
        <div className="w3-container w3-padding-24">
          <StatsGrid columns={4}>
            <StatsCard
              icon={<FaCalendarCheck />}
              title="出勤日数"
              value={`${stats.workDays || 0}日`}
              color="green"
            />
            <StatsCard
              icon={<FaClock />}
              title="総勤務時間"
              value={`${Math.floor(stats.totalHours || 0)}:${Math.round(((stats.totalHours || 0) % 1) * 60).toString().padStart(2, '0')}`}
              color="blue"
            />
            <StatsCard
              icon={<FaExclamationTriangle />}
              title="残業時間"
              value={`${Math.floor(stats.overtimeHours || 0)}:${Math.round(((stats.overtimeHours || 0) % 1) * 60).toString().padStart(2, '0')}`}
              color="orange"
            />
            <StatsCard
              icon={<FaDollarSign />}
              title="交通費"
              value={`¥${(stats.transportationCost || 0).toLocaleString()}`}
              color="purple"
            />
          </StatsGrid>
          
          {/* 詳細統計 */}
          <div className="w3-row-padding w3-margin-top">
            <div className="w3-col l6 m12">
              <DataTable
                title="勤怠詳細"
                data={[
                  { label: '遅刻回数', value: `${stats.lateCount || 0}回`, color: 'red' },
                  { label: '休暇日数', value: `${stats.leaveDays || 0}日`, color: 'blue' },
                  { label: '承認待ち', value: `${stats.pendingCount || 0}件`, color: 'orange' }
                ]}
                renderRow={(item) => (
                  <tr key={item.label}>
                    <td className="w3-text-grey">{item.label}:</td>
                    <td className={`w3-text-${item.color}`}>
                      <strong>{item.value}</strong>
                    </td>
                  </tr>
                )}
              />
            </div>
            
            <div className="w3-col l6 m12">
              <DataTable
                title="勤務実績"
                data={[
                  { label: '平均出勤時刻', value: stats.avgClockIn || '--:--' },
                  { label: '平均退勤時刻', value: stats.avgClockOut || '--:--' },
                  { label: '平均勤務時間', value: stats.avgWorkHours || '--:--' }
                ]}
                renderRow={(item) => (
                  <tr key={item.label}>
                    <td className="w3-text-grey">{item.label}:</td>
                    <td><strong>{item.value}</strong></td>
                  </tr>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Manager/Company用のチーム統計表示
  return (
    <div className="w3-white w3-margin-bottom w3-card-4">
      <header className="w3-container w3-gradient-blue w3-padding-16">
        <div className="w3-row">
          <div className="w3-col l8 m8">
            <h3 className="w3-text-white">
              <FaUsers className="w3-margin-right" />
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 チーム勤務統計
            </h3>
            <p className="w3-text-white w3-opacity">チームメンバーの勤務実績サマリー</p>
          </div>
          <div className="w3-col l4 m4 w3-right-align">
            {projects.length > 0 && (
              <Filter
                type="select"
                label="プロジェクト"
                value={selectedProject}
                onChange={setSelectedProject}
                options={[
                  { value: '', label: '全プロジェクト' },
                  ...projects.map(project => ({ value: project.id, label: project.name }))
                ]}
                className="project-select"
                style={{ width: '200px', display: 'inline-block' }}
              />
            )}
          </div>
        </div>
      </header>
      
      <div className="w3-container w3-padding-24">
        {/* 全体サマリー */}
        <StatsGrid columns={4}>
          <StatsCard
            icon={<FaUsers />}
            title="総メンバー数"
            value={`${stats.totalMembers || 0}名`}
            color="green"
          />
          <StatsCard
            icon={<FaClock />}
            title="総勤務時間"
            value={`${Math.floor(stats.totalTeamHours || 0)}時間`}
            color="blue"
          />
          <StatsCard
            icon={<FaExclamationTriangle />}
            title="承認待ち"
            value={`${stats.totalPending || 0}件`}
            color="orange"
          />
          <StatsCard
            icon={<FaDollarSign />}
            title="総交通費"
            value={`¥${(stats.totalTransportation || 0).toLocaleString()}`}
            color="purple"
          />
        </StatsGrid>
        
        {/* メンバー別詳細テーブル */}
        <div className="w3-margin-top">
          <DataTable
            title="メンバー別詳細統計"
            icon={<FaChartBar />}
            headers={[
              'メンバー名', 'プロジェクト', '出勤日数', '総勤務時間', 
              '残業時間', '遅刻回数', '承認待ち', '交通費'
            ]}
            data={stats.memberStats || []}
            renderRow={(member, index) => (
              <tr key={member.userId || index}>
                <td>
                  <div className="w3-row">
                    <div className="w3-col w3">
                      <div className="w3-circle w3-blue w3-center member-avatar" style={{ width: '30px', height: '30px', lineHeight: '30px' }}>
                        <small className="w3-text-white">{member.name?.charAt(0) || 'U'}</small>
                      </div>
                    </div>
                    <div className="w3-col w9 w3-padding-left">
                      <strong>{member.name || '名前不明'}</strong>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="w3-tag w3-small w3-blue w3-round">
                    {member.projectName || '未配属'}
                  </span>
                </td>
                <td>{member.workDays || 0}日</td>
                <td>{Math.floor(member.totalHours || 0)}:{Math.round(((member.totalHours || 0) % 1) * 60).toString().padStart(2, '0')}</td>
                <td className="w3-text-orange">{Math.floor(member.overtimeHours || 0)}:{Math.round(((member.overtimeHours || 0) % 1) * 60).toString().padStart(2, '0')}</td>
                <td className={`${(member.lateCount || 0) > 0 ? 'w3-text-red' : ''}`}>{member.lateCount || 0}回</td>
                <td>
                  <span className={`w3-tag w3-small w3-round ${(member.pendingCount || 0) > 0 ? 'w3-orange' : 'w3-green'}`}>
                    {member.pendingCount || 0}件
                  </span>
                </td>
                <td>¥{(member.transportationCost || 0).toLocaleString()}</td>
              </tr>
            )}
            emptyMessage="表示するデータがありません"
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;
