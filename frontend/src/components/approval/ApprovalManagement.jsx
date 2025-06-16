import React, { useState, useEffect } from 'react';
import { 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaUser, 
  FaCalendarCheck, 
  FaHourglassHalf,
  FaClipboardList,
  FaChartBar,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../../utils/axios';
import { useSnackbar } from '../../hooks/useSnackbar';
import Snackbar from '../Snackbar';

const ApprovalManagement = ({ userId, userRole }) => {
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState('leave');
  const [leaveApprovals, setLeaveApprovals] = useState([]);
  const [monthlyApprovals, setMonthlyApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leave') {
        await fetchLeaveApprovals();
      } else if (activeTab === 'monthly') {
        await fetchMonthlyApprovals();
      }
    } catch (error) {
      console.error('承認データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchLeaveApprovals = async () => {
    try {
      const params = { 
        status: 'PENDING',
        t: Date.now() // キャッシュ回避用タイムスタンプ
      };
      
      // COMPANY権限の場合はuserIdパラメータを除外
      if (userRole !== 'COMPANY' && userRole !== 'ADMIN') {
        params.userId = userId;
      }
      
      const response = await api.get('/leave/leave-requests', { params });
      
      const approvals = response.data.data?.leaveRequests || [];
      setLeaveApprovals(approvals);
    } catch (error) {
      console.error('❌ Leave approvals fetch error:', error);
      setLeaveApprovals([]);
    }
  };
  const fetchMonthlyApprovals = async () => {
    try {
      // 月次報告の承認待ちを取得
      const response = await api.get('/monthly-reports/pending-approvals', {
        params: { t: Date.now() } // キャッシュ回避用タイムスタンプ
      });
      setMonthlyApprovals(response.data.data || []);
    } catch (error) {
      console.error('月次承認取得エラー:', error);
      setMonthlyApprovals([]);
    }
  };

  const handleLeaveApproval = async (requestId, action) => {
    try {
      const data = { action };
      if (action === 'reject' && rejectReason.trim()) {
        data.rejectReason = rejectReason;
      }

      await api.patch(`/leave/leave-request/${requestId}/approve`, data);
      
      showSuccess(action === 'approve' ? '休暇申請を承認しました' : '休暇申請を却下しました');
      setSelectedRequest(null);
      setRejectReason('');
      fetchLeaveApprovals();
    } catch (error) {
      console.error('休暇承認処理エラー:', error);
      showError(error.response?.data?.message || '処理に失敗しました');
    }
  };

  const handleMonthlyApproval = async (reportId, action) => {
    try {
      const data = { action };
      if (action === 'reject' && rejectReason.trim()) {
        data.rejectReason = rejectReason;
      }

      await api.patch(`/monthly-reports/${reportId}/approve`, data);
      
      showSuccess(action === 'approve' ? '月次報告を承認しました' : '月次報告を却下しました');
      setSelectedRequest(null);
      setRejectReason('');
      fetchMonthlyApprovals();
    } catch (error) {
      console.error('月次承認処理エラー:', error);
      showError(error.response?.data?.message || '処理に失敗しました');
    }
  };

  const getLeaveTypeLabel = (type) => {
    const types = {
      'PAID_LEAVE': '有給休暇',
      'SICK_LEAVE': '病気休暇', 
      'PERSONAL_LEAVE': '私用休暇',
      'MATERNITY': '産前産後休暇',
      'PATERNITY': '育児休暇',
      'SPECIAL': '特別休暇',
      'UNPAID': '無給休暇'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const renderTabNavigation = () => (
    <div className="w3-bar w3-white w3-card w3-round w3-margin-bottom">
      <button
        onClick={() => setActiveTab('leave')}
        className={`w3-bar-item w3-button w3-hover-blue ${
          activeTab === 'leave' ? 'w3-blue' : ''
        }`}
      >
        <FaCalendarCheck className="w3-margin-right" />
        休暇申請承認
        {leaveApprovals.length > 0 && (
          <span className="w3-badge w3-red w3-margin-left">
            {leaveApprovals.length}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab('monthly')}
        className={`w3-bar-item w3-button w3-hover-blue ${
          activeTab === 'monthly' ? 'w3-blue' : ''
        }`}
      >
        <FaChartBar className="w3-margin-right" />
        月次報告承認
        {monthlyApprovals.length > 0 && (
          <span className="w3-badge w3-red w3-margin-left">
            {monthlyApprovals.length}
          </span>
        )}
      </button>
    </div>
  );

  const renderLeaveApprovals = () => (
    <div className="w3-container">
      <div className="w3-card w3-white w3-round">
        <header className="w3-container w3-blue w3-padding">
          <h3>
            <FaCalendarCheck className="w3-margin-right" />
            休暇申請承認管理
          </h3>
          <p>社員からの休暇申請を確認・承認します</p>
        </header>

        <div className="w3-container w3-padding">
          {loading && (
            <div className="w3-center w3-padding">
              <i className="fa fa-spinner fa-spin w3-xlarge"></i>
              <p>データを読み込み中...</p>
            </div>
          )}

          {!loading && leaveApprovals.length === 0 && (
            <div className="w3-panel w3-pale-green w3-leftbar w3-border-green">
              <h4><FaCheck className="w3-margin-right" />承認待ちの申請がありません</h4>
              <p>現在、承認が必要な休暇申請はありません。</p>
            </div>
          )}

          {!loading && leaveApprovals.length > 0 && (
            <div className="w3-responsive">
              <table className="w3-table-all w3-hoverable w3-card">
                <thead>
                  <tr className="w3-blue">
                    <th>申請者</th>
                    <th>申請種別</th>
                    <th>期間</th>
                    <th>日数</th>
                    <th>理由</th>
                    <th>申請日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveApprovals.map(request => (
                    <tr key={request.id}>
                      <td>
                        <div className="w3-left">
                          <FaUser className="w3-margin-right w3-text-blue" />                          <strong>
                            {request.user?.firstName && request.user?.lastName 
                              ? `${request.user.firstName} ${request.user.lastName}`
                              : request.userName || '不明なユーザー'
                            }
                          </strong>
                        </div>
                      </td>
                      <td>
                        <span className="w3-tag w3-blue w3-round w3-small">
                          {getLeaveTypeLabel(request.leaveType || request.type)}
                        </span>
                      </td>
                      <td>
                        {formatDate(request.startDate)} ～ {formatDate(request.endDate)}
                      </td>
                      <td>
                        <strong>{request.days || 0}日</strong>
                      </td>
                      <td>
                        <div className="w3-tooltip">
                          {request.reason.length > 20 
                            ? `${request.reason.substring(0, 20)}...` 
                            : request.reason}
                          <span className="w3-text w3-tag w3-round">
                            {request.reason}
                          </span>
                        </div>
                      </td>
                      <td>
                        {formatDate(request.createdAt)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleLeaveApproval(request.id, 'approve')}
                          className="w3-button w3-green w3-small w3-round w3-margin-right"
                          title="承認"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="w3-button w3-red w3-small w3-round w3-margin-right"
                          title="却下"
                        >
                          <FaTimes />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="w3-button w3-blue w3-small w3-round"
                          title="詳細"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMonthlyApprovals = () => (
    <div className="w3-container">
      <div className="w3-card w3-white w3-round">
        <header className="w3-container w3-orange w3-padding">
          <h3>
            <FaChartBar className="w3-margin-right" />
            月次報告承認管理
          </h3>
          <p>メンバーからの月次報告を確認・承認します</p>
        </header>

        <div className="w3-container w3-padding">
          {loading && (
            <div className="w3-center w3-padding">
              <i className="fa fa-spinner fa-spin w3-xlarge"></i>
              <p>データを読み込み中...</p>
            </div>
          )}

          {!loading && monthlyApprovals.length === 0 && (
            <div className="w3-panel w3-pale-green w3-leftbar w3-border-green">
              <h4><FaCheck className="w3-margin-right" />承認待ちの月次報告がありません</h4>
              <p>現在、承認が必要な月次報告はありません。</p>
            </div>
          )}

          {!loading && monthlyApprovals.length > 0 && (
            <div className="w3-responsive">
              <table className="w3-table-all w3-hoverable w3-card">
                <thead>
                  <tr className="w3-orange">
                    <th>報告者</th>
                    <th>対象月</th>
                    <th>プロジェクト</th>
                    <th>工数</th>
                    <th>提出日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyApprovals.map(report => (
                    <tr key={report.id}>
                      <td>
                        <div className="w3-left">
                          <FaUser className="w3-margin-right w3-text-orange" />                          <strong>
                            {report.user?.firstName && report.user?.lastName 
                              ? `${report.user.firstName} ${report.user.lastName}`
                              : report.userName || '不明なユーザー'
                            }
                          </strong>
                        </div>
                      </td>
                      <td>
                        {report.year}年{report.month}月
                      </td>
                      <td>
                        {report.project?.name || '未設定'}
                      </td>
                      <td>
                        <strong>{report.totalHours || 0}時間</strong>
                      </td>
                      <td>
                        {formatDate(report.createdAt)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleMonthlyApproval(report.id, 'approve')}
                          className="w3-button w3-green w3-small w3-round w3-margin-right"
                          title="承認"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(report)}
                          className="w3-button w3-red w3-small w3-round w3-margin-right"
                          title="却下"
                        >
                          <FaTimes />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(report)}
                          className="w3-button w3-orange w3-small w3-round"
                          title="詳細"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRejectModal = () => {
    if (!selectedRequest) return null;

    const isLeave = activeTab === 'leave';
    
    return (
      <div className="w3-modal" style={{ display: 'block' }}>
        <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px' }}>
          <header className="w3-container w3-red">
            <span 
              onClick={() => {
                setSelectedRequest(null);
                setRejectReason('');
              }}
              className="w3-button w3-display-topright"
            >
              &times;
            </span>
            <h2>
              <FaExclamationTriangle className="w3-margin-right" />
              {isLeave ? '休暇申請' : '月次報告'}却下
            </h2>
          </header>
          
          <div className="w3-container w3-padding">
            <h4>却下理由を入力してください</h4>
            <textarea
              className="w3-input w3-border w3-round"
              rows="4"
              placeholder="却下の理由を詳しく入力してください..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            
            <div className="w3-margin-top w3-right">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectReason('');
                }}
                className="w3-button w3-grey w3-round w3-margin-right"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (isLeave) {
                    handleLeaveApproval(selectedRequest.id, 'reject');
                  } else {
                    handleMonthlyApproval(selectedRequest.id, 'reject');
                  }
                }}
                className="w3-button w3-red w3-round"
                disabled={!rejectReason.trim()}
              >
                <FaTimes className="w3-margin-right" />
                却下する
              </button>
            </div>
            <div className="w3-clear"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w3-container w3-margin-top">
      {/* ヘッダー */}
      <div className="w3-card w3-purple w3-padding w3-margin-bottom w3-round">
        <h2>
          <FaClipboardList className="w3-margin-right" />
          承認管理センター
        </h2>
        <p>休暇申請と月次報告の承認を一元管理します</p>
      </div>

      {/* 統計サマリー */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col s6 m6">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-blue">
              <FaCalendarCheck />
            </div>
            <h3 className="w3-text-blue">{leaveApprovals.length}</h3>
            <p>休暇申請待ち</p>
          </div>
        </div>
        <div className="w3-col s6 m6">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-orange">
              <FaChartBar />
            </div>
            <h3 className="w3-text-orange">{monthlyApprovals.length}</h3>
            <p>月次報告待ち</p>
          </div>
        </div>
      </div>

      {renderTabNavigation()}
      
      {activeTab === 'leave' && renderLeaveApprovals()}
      {activeTab === 'monthly' && renderMonthlyApprovals()}
      
      {renderRejectModal()}
      
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default ApprovalManagement;
