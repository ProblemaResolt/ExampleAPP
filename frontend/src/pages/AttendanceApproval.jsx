import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck, FaTimes, FaClock, FaDownload, FaUser, FaUsers, FaCheckCircle } from 'react-icons/fa';
import api from '../utils/axios';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Snackbar from '../components/Snackbar';

const AttendanceApproval = () => {
  const [selectedEntries, setSelectedEntries] = useState([]);  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  // Snackbarの状態
  const [snackbar, setSnackbar] = useState({
    isOpen: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      isOpen: true,
      message,
      severity
    });
  };const [filters, setFilters] = useState({
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
  const handleExcelDownload = async (projectId, projectName, userId) => {
    try {
      let url, params, filename;
      if (userId) {
        // 個人用
        url = '/attendance/export-member-excel';
        params = { year: filters.year, month: filters.month, userId };
        filename = `${projectName}_勤怠記録_${filters.year}年${filters.month}月.xlsx`;
      } else {
        // プロジェクト用
        url = '/attendance/export/excel';
        params = { year: filters.year, month: filters.month, projectId, format: 'monthly' };
        filename = `${projectName}_勤怠記録_${filters.year}年${filters.month}月.xlsx`;
      }
      const response = await api.get(url, {
        params,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (error) {
      showSnackbar('Excelダウンロードに失敗しました', 'error');
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
      document.body.removeChild(link);    } catch (error) {
      console.error('Project Excel download failed:', error);
      showSnackbar('プロジェクトExcelダウンロードに失敗しました', 'error');
    }
  };

  // プロジェクト単位でのPDFダウンロード
  const handleProjectPdfDownload = async (projectId, projectName) => {
    try {
      const response = await api.get(`/attendance/export-project-pdf?year=${filters.year}&month=${filters.month}&projectId=${projectId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_${filters.year}年${filters.month}月_勤怠記録.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);    } catch (error) {
      console.error('Project PDF download failed:', error);
      showSnackbar('プロジェクトPDFダウンロードに失敗しました', 'error');
    }
  };

  const handleMemberClick = (userId, firstName, lastName) => {
    // 個別勤怠記録表ページに遷移（指定した年月）
    window.open(`/attendance/individual/${userId}?year=${filters.year}&month=${filters.month}&name=${lastName}${firstName}`, '_blank');
  };
  // メンバーの一括承認・却下処理
  const handleMemberBulkApproval = async (userId, userName, action) => {
    const actionText = action === 'APPROVED' ? '承認' : '却下';
    const dialogType = action === 'APPROVED' ? 'success' : 'danger';
    
    setConfirmDialog({
      isOpen: true,
      title: `一括${actionText}確認`,
      message: `${userName}さんの承認待ち勤怠記録をすべて${actionText}しますか？`,
      type: dialogType,
      onConfirm: async () => {        try {
          const endpoint = action === 'APPROVED' 
            ? `/attendance/bulk-approve-member/${userId}`
            : `/attendance/bulk-reject-member/${userId}`;
          
          const response = await api.patch(endpoint, {
            action,
            year: filters.year,
            month: filters.month          });
            // データを再取得
          queryClient.invalidateQueries(['project-members-summary']);
          showSnackbar(`${userName}さんの勤怠記録を一括${actionText}しました`, 'success');
        } catch (error) {
          console.error(`Bulk ${actionText} failed:`, error);
          showSnackbar(`一括${actionText}に失敗しました`, 'error');
        }
      }
    });
  };

  // 個人のPDFダウンロード
  const handleMemberPdfDownload = async (userId, userName) => {
    try {
      const response = await api.get(`/attendance/export-member-pdf?year=${filters.year}&month=${filters.month}&userId=${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userName}_${filters.year}年${filters.month}月_勤怠記録.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);    } catch (error) {
      console.error('Member PDF download failed:', error);
      showSnackbar('個人PDFダウンロードに失敗しました', 'error');
    }
  };

  // プロジェクト全体の一括承認・却下処理
  const handleProjectBulkApproval = async (projectId, projectName, action) => {
    const actionText = action === 'APPROVED' ? '承認' : '却下';
    const dialogType = action === 'APPROVED' ? 'success' : 'danger';
    
    // プロジェクトのメンバー数を取得
    const projectData = summaryData?.data?.projects?.find(p => p.project.id === projectId);
    const memberCount = projectData?.members?.filter(member => member.stats.pendingCount > 0).length || 0;
    
    if (memberCount === 0) {
      showSnackbar('承認待ちの勤怠記録がありません', 'info');
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: `プロジェクト一括${actionText}確認`,
      message: `${projectName}の承認待ち勤怠記録（${memberCount}名分）をすべて${actionText}しますか？`,
      type: dialogType,
      onConfirm: async () => {
        try {
          // プロジェクトの全メンバーの一括処理
          const promises = projectData.members
            .filter(member => member.stats.pendingCount > 0)
            .map(member => {
              const endpoint = action === 'APPROVED' 
                ? `/attendance/bulk-approve-member/${member.user.id}`
                : `/attendance/bulk-reject-member/${member.user.id}`;
              
              return api.patch(endpoint, {
                action,
                year: filters.year,
                month: filters.month
              });
            });
          
          await Promise.all(promises);
          
          // データを再取得
          queryClient.invalidateQueries(['project-members-summary']);
          showSnackbar(`${projectName}の勤怠記録を一括${actionText}しました（${memberCount}名分）`, 'success');
        } catch (error) {
          console.error(`Project bulk ${actionText} failed:`, error);
          showSnackbar(`プロジェクト一括${actionText}に失敗しました`, 'error');
        }
      }
    });
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
          <div key={projectData.project.id} className="w3-card-4 w3-margin-bottom">            <header className="w3-container w3-blue">
              <div className="w3-row" style={{ minHeight: '80px', alignItems: 'center', display: 'flex' }}>
                <div className="w3-col m7" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: '0 0 4px 0' }}>{projectData.project.name}</h4>
                  <p style={{ margin: '0 0 8px 0', opacity: 0.9 }}>{projectData.project.description || 'プロジェクト説明なし'}</p>
                  <div className="w3-small">
                    承認待ち: {projectData.projectStats.totalPendingCount}件 | 
                    承認済み: {projectData.projectStats.totalApprovedCount}件 | 
                    メンバー: {projectData.projectStats.totalMembers}名
                  </div>
                </div>                <div className="w3-col m5 w3-right-align">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'flex-end',
                    height: '100%',
                    gap: '8px'
                  }}>
                    {/* 全体承認・却下ボタン */}
                    {projectData.projectStats.totalPendingCount > 0 && (
                      <>
                        <button
                          className="w3-button w3-round"
                          onClick={() => handleProjectBulkApproval(projectData.project.id, projectData.project.name, 'APPROVED')}
                          title="プロジェクト全体を一括承認"
                          style={{
                            background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                            color: 'white',
                            border: 'none',
                            fontSize: '11px',
                            padding: '6px 12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <FaCheckCircle className="w3-margin-right" />
                          全体承認
                        </button>
                        <button
                          className="w3-button w3-round"
                          onClick={() => handleProjectBulkApproval(projectData.project.id, projectData.project.name, 'REJECTED')}
                          title="プロジェクト全体を一括却下"
                          style={{
                            background: 'linear-gradient(135deg, #f44336, #d32f2f)',
                            color: 'white',
                            border: 'none',
                            fontSize: '11px',
                            padding: '6px 12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <FaTimes className="w3-margin-right" />
                          全体却下
                        </button>
                      </>
                    )}
                    
                    {/* Excelダウンロードボタン */}
                    <button
                      className={`w3-button w3-round ${
                        projectData.projectStats.canExportProject 
                          ? 'w3-green' 
                          : 'w3-grey w3-disabled'
                      }`}
                      onClick={() => handleProjectExcelDownload(projectData.project.id, projectData.project.name)}
                      disabled={!projectData.projectStats.canExportProject}
                      title={projectData.projectStats.canExportProject 
                        ? 'プロジェクト全体のExcelをダウンロード' 
                        : '全メンバーの承認完了後にダウンロード可能'}
                      style={{
                        fontSize: '11px',
                        padding: '6px 12px',
                        boxShadow: projectData.projectStats.canExportProject ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >
                      <FaDownload className="w3-margin-right" />
                      Excel
                    </button>
                    
                    {/* PDFダウンロードボタン */}
                    <button
                      className={`w3-button w3-round ${
                        projectData.projectStats.canExportProject 
                          ? 'w3-red' 
                          : 'w3-grey w3-disabled'
                      }`}
                      onClick={() => handleProjectPdfDownload(projectData.project.id, projectData.project.name)}
                      disabled={!projectData.projectStats.canExportProject}
                      title={projectData.projectStats.canExportProject 
                        ? 'プロジェクト全体のPDFをダウンロード' 
                        : '全メンバーの承認完了後にダウンロード可能'}
                      style={{
                        fontSize: '11px',
                        padding: '6px 12px',
                        boxShadow: projectData.projectStats.canExportProject ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >                      <FaDownload className="w3-margin-right" />
                      PDF
                    </button>
                  </div>
                </div>
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
                      <th>{projectData.members.some(member => member.stats.pendingCount > 0) ? '承認' : 'ダウンロード'}</th>
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
                        <td>{member.stats.approvalRate}%</td>                        <td>
                          {/* 承認待ちがある場合：一括承認・却下ボタン */}
                          {member.stats.pendingCount > 0 ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="w3-button w3-round w3-tiny"
                                onClick={() => handleMemberBulkApproval(member.user.id, `${member.user.lastName} ${member.user.firstName}`, 'APPROVED')}
                                disabled={bulkApprovalMutation.isPending}
                                title="承認待ちを一括承認"
                                style={{
                                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  fontSize: '10px'
                                }}
                              >
                                <FaCheck />
                              </button>
                              <button
                                className="w3-button w3-round w3-tiny"
                                onClick={() => handleMemberBulkApproval(member.user.id, `${member.user.lastName} ${member.user.firstName}`, 'REJECTED')}
                                disabled={bulkApprovalMutation.isPending}
                                title="承認待ちを一括却下"
                                style={{
                                  background: 'linear-gradient(135deg, #f44336, #d32f2f)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  fontSize: '10px'
                                }}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            /* 承認完了後：ダウンロードボタン */
                            member.canExport ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  className="w3-button w3-blue w3-round w3-tiny"
                                  onClick={() => handleExcelDownload(null, `${member.user.lastName}${member.user.firstName}`, member.user.id)}
                                  title="個人のExcelをダウンロード"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '10px'
                                  }}
                                >
                                  <FaDownload /> Excel
                                </button>
                                <button
                                  className="w3-button w3-red w3-round w3-tiny"
                                  onClick={() => handleMemberPdfDownload(member.user.id, `${member.user.lastName}${member.user.firstName}`)}
                                  title="個人のPDFをダウンロード"
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '10px'
                                  }}
                                >
                                  <FaDownload /> PDF
                                </button>
                              </div>
                            ) : (
                              <span className="w3-text-grey w3-small">承認完了</span>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>        ))
      )}
        {/* 確認ダイアログ */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        isLoading={bulkApprovalMutation.isPending}        confirmText="はい"
        cancelText="キャンセル"
      />

      {/* Snackbar */}
      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, isOpen: false })}
      />
    </div>
  );
};

export default AttendanceApproval;
