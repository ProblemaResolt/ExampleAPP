import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck, FaTimes, FaClock, FaDownload, FaUser } from 'react-icons/fa';
import api from '../utils/axios';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';

const AttendanceApproval = () => {
  const [selectedEntries, setSelectedEntries] = useState([]);  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    projectId: '',
    page: 1,
    limit: 20
  });
  // プロジェクト毎のメンバー月間サマリーの取得
  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['project-members-summary', filters],
    queryFn: async () => {
      console.log('API Request - Filters:', filters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      console.log('API Request - URL:', `/attendance/project-members-summary?${params}`);
      
      const response = await api.get(`/attendance/project-members-summary?${params}`);
      console.log('API Response:', response);
      return response.data;
    }
  });
  const queryClient = useQueryClient();
  // メンバー一括承認のミューテーション
  const bulkApprovalMutation = useMutation({
    mutationFn: async ({ memberUserId, action }) => {
      // メンバーの承認待ち勤怠記録をすべて処理
      const endpoint = action === 'APPROVED' 
        ? `/attendance/bulk-approve-member/${memberUserId}`
        : `/attendance/bulk-reject-member/${memberUserId}`;
      
      const response = await api.patch(endpoint, {
        action,
        year: filters.year,
        month: filters.month
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members-summary'] });
    }
  });

  // Excelダウンロードの処理
  const handleExcelDownload = async (projectId, projectName) => {
    try {
      const response = await api.get(`/attendance/export/excel`, {
        params: {
          year: filters.year,
          month: filters.month,
          projectId: projectId,
          format: 'monthly'
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_勤怠記録_${filters.year}年${filters.month}月.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      alert('Excelダウンロードに失敗しました');
    }
  };

  // プロジェクト単位でのExcelダウンロード
  const handleProjectExcelDownload = async (projectId, projectName) => {
    try {
      const response = await api.get(`/attendance/export-project-excel?year=${filters.year}&month=${filters.month}&projectId=${projectId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_${filters.year}年${filters.month}月_勤怠記録.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Project Excel download failed:', error);
      alert('プロジェクトExcelダウンロードに失敗しました');
    }
  };

  const handleMemberClick = (userId, firstName, lastName) => {
    // 個別勤怠記録表ページに遷移（指定した年月）
    window.open(`/attendance/individual/${userId}?year=${filters.year}&month=${filters.month}&name=${lastName}${firstName}`, '_blank');
  };

  // メンバーの一括承認・却下処理
  const handleMemberBulkApproval = async (userId, userName, action) => {
    const actionText = action === 'APPROVED' ? '承認' : '却下';
    if (!confirm(`${userName}さんの承認待ち勤怠記録を一括${actionText}しますか？`)) {
      return;
    }

    try {
      console.log(`Bulk ${actionText} request for user:`, userId);
        const endpoint = action === 'APPROVED' 
        ? `/attendance/bulk-approve-member/${userId}`
        : `/attendance/bulk-reject-member/${userId}`;
      
      const response = await api.patch(endpoint, {
        year: filters.year,
        month: filters.month
      });
      
      console.log(`Bulk ${actionText} response:`, response.data);
      
      // データを再取得
      queryClient.invalidateQueries(['project-members-summary']);
      alert(`${userName}さんの勤怠記録を一括${actionText}しました`);
    } catch (error) {
      console.error(`Bulk ${actionText} failed:`, error);
      alert(`一括${actionText}に失敗しました: ${error.response?.data?.message || error.message}`);
    }
  };

  if (isLoading) {
    return <Loading message="月間サマリーを読み込み中..." />;
  }

  if (error) {
    return (
      <div className="w3-container">
        <ErrorMessage 
          error={error} 
          title="月間サマリーの取得に失敗しました"
        />
      </div>
    );
  }

  const projects = summaryData?.data?.projects || [];
  const summary = summaryData?.data?.summary || {};

  return (
    <div className="w3-container">
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col m8">
          <h2><FaClock className="w3-margin-right" />勤怠承認管理（プロジェクト別月間サマリー）</h2>
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

      {/* サマリー情報 */}
      <div className="w3-panel w3-blue w3-leftbar">
        <p><strong>全体サマリー:</strong> {summary.totalProjects}プロジェクト、{summary.totalMembers}メンバー、承認待ち{summary.totalPendingCount}件</p>
      </div>

      {/* プロジェクト毎のメンバー月間サマリー */}
      {projects.length === 0 ? (
        <div className="w3-card-4">
          <div className="w3-container w3-center w3-padding">
            <p>プロジェクトデータがありません。</p>
          </div>
        </div>
      ) : (
        projects.map((projectData) => (
          <div key={projectData.project.id} className="w3-card-4 w3-margin-bottom">
            <header className="w3-container w3-blue">
              <div className="w3-row">
                <div className="w3-col m8">
                  <h4>{projectData.project.name}</h4>
                  <p>{projectData.project.description || 'プロジェクト説明なし'}</p>
                </div>
                <div className="w3-col m4 w3-right-align">
                  <button
                    className={`w3-button w3-margin-top ${
                      projectData.projectStats.canExportProject 
                        ? 'w3-green' 
                        : 'w3-grey w3-disabled'
                    }`}
                    onClick={() => handleProjectExcelDownload(projectData.project.id, projectData.project.name)}
                    disabled={!projectData.projectStats.canExportProject}
                    title={projectData.projectStats.canExportProject 
                      ? 'プロジェクト全体のExcelをダウンロード' 
                      : '全メンバーの承認完了後にダウンロード可能'}
                  >
                    <FaDownload className="w3-margin-right" />
                    Excel
                  </button>
                </div>
              </div>
              <div className="w3-small w3-margin-top">
                承認待ち: {projectData.projectStats.totalPendingCount}件 | 
                承認済み: {projectData.projectStats.totalApprovedCount}件 | 
                メンバー: {projectData.projectStats.totalMembers}名
              </div>
            </header>
            
            <div className="w3-container">
              <h5>メンバー月間サマリー</h5>
              
              <div className="w3-responsive">
                <table className="w3-table-all w3-hoverable">
                  <thead>
                    <tr className="w3-light-grey">
                      <th>メンバー名</th>
                      <th>役割</th>
                      <th>月間勤務日数</th>
                      <th>月間実働時間</th>
                      <th>承認待ち</th>
                      <th>承認済み</th>
                      <th>承認率</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData.members.map((member) => (
                      <tr key={member.user.id}>
                        <td>
                          <button
                            className="w3-button w3-blue w3-small"
                            onClick={() => handleMemberClick(member.user.id, member.user.firstName, member.user.lastName)}
                            title="個別勤怠記録表を表示"
                          >
                            <FaUser className="w3-margin-right" />
                            {member.user.lastName} {member.user.firstName}
                          </button>
                        </td>
                        <td>
                          <span className={`w3-tag w3-small ${member.role === 'MANAGER' ? 'w3-purple' : 'w3-blue'}`}>
                            {member.role === 'MANAGER' ? 'マネージャー' : 'メンバー'}
                          </span>
                        </td>
                        <td>{member.stats.totalWorkDays}日</td>
                        <td>{member.stats.totalWorkHours}時間</td>
                        <td>
                          <span className={`w3-tag w3-small ${member.stats.pendingCount > 0 ? 'w3-orange' : 'w3-light-grey'}`}>
                            {member.stats.pendingCount}件
                          </span>
                        </td>
                        <td>
                          <span className="w3-tag w3-small w3-green">
                            {member.stats.approvedCount}件
                          </span>
                        </td>
                        <td>{member.stats.approvalRate}%</td>
                        <td>
                          {member.stats.pendingCount > 0 && (
                            <>
                              <button
                                className="w3-button w3-green w3-small w3-margin-right"
                                onClick={() => handleMemberBulkApproval(member.user.id, `${member.user.lastName} ${member.user.firstName}`, 'APPROVED')}
                                disabled={bulkApprovalMutation.isPending}
                                title="承認待ちを一括承認"
                              >
                                <FaCheck />
                              </button>
                              <button
                                className="w3-button w3-red w3-small w3-margin-right"
                                onClick={() => handleMemberBulkApproval(member.user.id, `${member.user.lastName} ${member.user.firstName}`, 'REJECTED')}
                                disabled={bulkApprovalMutation.isPending}
                                title="承認待ちを一括却下"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {member.canExport && (
                            <button
                              className="w3-button w3-blue w3-small"
                              onClick={() => handleExcelDownload(null, `${member.user.lastName}${member.user.firstName}`, member.user.id)}
                              title="個人のExcelをダウンロード"
                            >
                              <FaDownload />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}    </div>
  );
};

export default AttendanceApproval;
