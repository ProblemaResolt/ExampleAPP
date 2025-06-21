import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaUser, FaClock, FaCalendarDay, FaDownload, FaCheck, FaTimes, FaHome, FaChevronRight, FaFilePdf } from 'react-icons/fa';
import api from '../utils/axios';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import ConfirmDialog from '../components/common/ConfirmDialog';

const AttendanceIndividual = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear();
  const month = searchParams.get('month') || new Date().getMonth() + 1;
  const name = searchParams.get('name') || '';
  const queryClient = useQueryClient();
  
  // 確認ダイアログの状態
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });
  
  // 個人の月間勤怠データを取得
  const { data: attendanceData, isLoading, error } = useQuery({
    queryKey: ['individual-attendance', userId, year, month],
    queryFn: async () => {
      console.log('Individual Attendance API Request:', { userId, year, month });
      const response = await api.get(`/attendance/individual/${userId}?year=${year}&month=${month}`);
      console.log('Individual Attendance API Response:', response);
      return response.data;
    }
  });

  // 月の日数を取得
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  // 日付フォーマット関数
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 時間フォーマット関数
  const formatTime = (time) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ステータスの表示
  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { class: 'w3-yellow', text: '承認待ち' },
      APPROVED: { class: 'w3-green', text: '承認済み' },
      REJECTED: { class: 'w3-red', text: '却下' }
    };
    const config = statusConfig[status] || { class: 'w3-gray', text: '不明' };
    return (
      <span className={`w3-tag w3-small ${config.class}`}>
        {config.text}
      </span>
    );
  };
  // Excelダウンロード
  const handleExcelDownload = async () => {
    try {
      const response = await api.get(`/attendance/export-member-excel?year=${year}&month=${month}&userId=${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}_${year}年${month}月_勤怠記録.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel download failed:', error);
      alert('Excelダウンロードに失敗しました');
    }
  };

  // PDFダウンロード
  const handlePdfDownload = async () => {
    try {
      const response = await api.get(`/attendance/export-member-pdf?year=${year}&month=${month}&userId=${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}_${year}年${month}月_勤怠記録.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDFダウンロードに失敗しました');
    }
  };

  // 個別勤怠記録の承認
  const approveTimeEntryMutation = useMutation({
    mutationFn: async (timeEntryId) => {
      return await api.patch(`/attendance/time-entry/${timeEntryId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individual-attendance', userId, year, month]);
      alert('勤怠記録が承認されました');
    },
    onError: (error) => {
      console.error('Approval failed:', error);
      alert('承認に失敗しました');
    }
  });

  // 個別勤怠記録の却下
  const rejectTimeEntryMutation = useMutation({
    mutationFn: async (timeEntryId) => {
      return await api.patch(`/attendance/time-entry/${timeEntryId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individual-attendance', userId, year, month]);
      alert('勤怠記録が却下されました');
    },
    onError: (error) => {
      console.error('Rejection failed:', error);
      alert('却下に失敗しました');
    }
  });
  // 承認・却下ハンドラー
  const handleApprove = (timeEntryId) => {
    setConfirmDialog({
      isOpen: true,
      title: '勤怠記録承認',
      message: 'この勤怠記録を承認しますか？',
      type: 'success',
      onConfirm: () => {
        approveTimeEntryMutation.mutate(timeEntryId);
      }
    });
  };

  const handleReject = (timeEntryId) => {
    setConfirmDialog({
      isOpen: true,
      title: '勤怠記録却下',
      message: 'この勤怠記録を却下しますか？',
      type: 'danger',
      onConfirm: () => {
        rejectTimeEntryMutation.mutate(timeEntryId);
      }
    });
  };

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="w3-container w3-margin-top">
        <ErrorMessage 
          error={error} 
          message="個人勤怠データの取得に失敗しました" 
        />
      </div>
    );
  }

  const timeEntries = attendanceData?.data?.timeEntries || [];
  const userInfo = attendanceData?.data?.user || {};
  const period = attendanceData?.data?.period || {};
  return (
    <div className="w3-container w3-margin-top">
      {/* パンくずリスト */}
      <div className="w3-margin-bottom">
        <nav aria-label="パンくずリスト" className="w3-text-gray">
          <Link to="/" className="w3-text-blue w3-hover-text-blue">
            <FaHome className="w3-margin-right" />ホーム
          </Link>
          <FaChevronRight className="w3-margin-left w3-margin-right" />
          <Link to="/attendance/approval" className="w3-text-blue w3-hover-text-blue">
            勤怠承認管理
          </Link>
          <FaChevronRight className="w3-margin-left w3-margin-right" />
          <span>個別勤怠記録</span>
        </nav>
      </div>

      {/* ヘッダー */}
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col m8">
          <h2>
            <FaUser className="w3-margin-right" />
            {name || `${userInfo.firstName} ${userInfo.lastName}`}の個別勤怠記録
          </h2>
          <p className="w3-text-gray">
            <FaCalendarDay className="w3-margin-right" />
            {period.year}年{period.month}月
          </p>
        </div>
        <div className="w3-col m4 w3-right-align">
          <button 
            className="w3-button w3-blue"
            onClick={handleExcelDownload}
            disabled={timeEntries.length === 0}
          >
            <FaDownload className="w3-margin-right" />
            Excelダウンロード
          </button>
          <button 
            className="w3-button w3-red w3-margin-left"
            onClick={handlePdfDownload}
            disabled={timeEntries.length === 0}
          >
            <FaFilePdf className="w3-margin-right" />
            PDFダウンロード
          </button>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="w3-row w3-margin-bottom">
        <div className="w3-quarter">
          <div className="w3-card w3-blue w3-center w3-padding">
            <h3>{timeEntries.length}</h3>
            <p>総記録日数</p>
          </div>
        </div>
        <div className="w3-quarter">
          <div className="w3-card w3-green w3-center w3-padding">
            <h3>{timeEntries.filter(entry => entry.status === 'APPROVED').length}</h3>
            <p>承認済み</p>
          </div>
        </div>
        <div className="w3-quarter">
          <div className="w3-card w3-yellow w3-center w3-padding">
            <h3>{timeEntries.filter(entry => entry.status === 'PENDING').length}</h3>
            <p>承認待ち</p>
          </div>
        </div>
        <div className="w3-quarter">
          <div className="w3-card w3-gray w3-center w3-padding">
            <h3>{timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0).toFixed(1)}h</h3>
            <p>総労働時間</p>
          </div>
        </div>
      </div>

      {/* 日別勤怠記録テーブル */}
      <div className="w3-card">
        <header className="w3-container w3-blue">
          <h5><FaClock className="w3-margin-right" />日別勤怠記録</h5>
        </header>
        
        <div className="w3-container w3-padding">
          {timeEntries.length === 0 ? (
            <p className="w3-center w3-text-gray w3-padding">該当する勤怠記録がありません</p>
          ) : (
            <div className="w3-responsive">
              <table className="w3-table w3-striped w3-bordered">                <thead>
                  <tr className="w3-light-gray">
                    <th>日付</th>
                    <th>出勤時刻</th>
                    <th>退勤時刻</th>
                    <th>労働時間</th>
                    <th>時間外</th>
                    <th>休憩時間</th>
                    <th>ステータス</th>
                    <th>プロジェクト</th>
                    <th>備考</th>
                    <th>顧客承認</th>
                    <th>承認・非承認</th>
                  </tr>
                </thead>                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{formatTime(entry.clockIn)}</td>
                      <td>{formatTime(entry.clockOut)}</td>
                      <td>{entry.workHours ? `${entry.workHours.toFixed(1)}h` : '-'}</td>
                      <td>
                        {entry.workHours && entry.workHours > 8 ? 
                          `${(entry.workHours - 8).toFixed(1)}h` : '-'}
                      </td>
                      <td>{entry.breakTime ? `${entry.breakTime}分` : '-'}</td>
                      <td>{getStatusBadge(entry.status)}</td>
                      <td>
                        {entry.workReports && entry.workReports.length > 0 ? (
                          <div>
                            {entry.workReports.map(report => report.project?.name).join(', ')}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{entry.notes || '-'}</td>                      <td>
                        {entry.clientApproved ? (
                          <span className="w3-tag w3-round w3-green w3-small">承認済み</span>
                        ) : (
                          <span className="w3-tag w3-round w3-gray w3-small">未承認</span>
                        )}
                      </td>
                      <td>
                        {entry.status === 'PENDING' && (
                          <div className="w3-bar">
                            <button 
                              className="w3-button w3-green w3-small w3-margin-right"
                              onClick={() => handleApprove(entry.id)}
                              disabled={approveTimeEntryMutation.isLoading}
                            >
                              <FaCheck className="w3-margin-right" />承認
                            </button>
                            <button 
                              className="w3-button w3-red w3-small"
                              onClick={() => handleReject(entry.id)}
                              disabled={rejectTimeEntryMutation.isLoading}
                            >
                              <FaTimes className="w3-margin-right" />却下
                            </button>
                          </div>
                        )}
                        {entry.status !== 'PENDING' && (
                          <span className="w3-text-gray">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>            </div>
          )}
        </div>
      </div>      {/* 確認ダイアログ */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        confirmText="はい"
        cancelText="キャンセル"
        isLoading={approveTimeEntryMutation.isLoading || rejectTimeEntryMutation.isLoading}
      />
    </div>
  );
};

export default AttendanceIndividual;
