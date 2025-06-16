import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaEye, FaUser, FaCalendarCheck, FaHourglassHalf } from 'react-icons/fa';
import api from '../../utils/axios';
import { useSnackbar } from '../../hooks/useSnackbar';
import Snackbar from '../Snackbar';

const LeaveApprovalManagement = ({ userId, userRole }) => {
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);
  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const params = { 
        status: 'PENDING',
        t: Date.now() // キャッシュ回避用タイムスタンプ
      };
      if (userRole !== 'COMPANY' && userRole !== 'ADMIN') {
        params.userId = userId;
      }
      
      const response = await api.get('/leave/leave-requests', { params });
      setPendingApprovals(response.data.data?.leaveRequests || []);
    } catch (error) {
      console.error('承認待ち取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId, action) => {
    try {
      const data = { action };
      if (action === 'reject' && rejectReason.trim()) {
        data.rejectReason = rejectReason;
      }

      await api.patch(`/leave/leave-request/${requestId}/approve`, data);
      
      alert(action === 'approve' ? '申請を承認しました' : '申請を却下しました');
      setSelectedRequest(null);
      setRejectReason('');
      fetchPendingApprovals();
    } catch (error) {
      console.error('承認処理エラー:', error);
      alert(error.response?.data?.message || '処理に失敗しました');
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

  if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
    return (
      <div className="w3-panel w3-red w3-padding">
        <h3>アクセス権限がありません</h3>
        <p>承認管理機能は管理者のみ利用できます。</p>
      </div>
    );
  }

  return (
    <div className="w3-container">
      {/* ヘッダー */}
      <div className="w3-card w3-blue w3-padding w3-margin-bottom w3-round">
        <h2><FaCalendarCheck className="w3-margin-right" />承認管理</h2>
        <p>部下や社員からの休暇申請を確認・承認できます</p>
      </div>

      {/* 統計カード */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col s12 m4">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-orange">
              <FaHourglassHalf />
            </div>
            <h3 className="w3-text-orange">{pendingApprovals.length}</h3>
            <p>承認待ち申請</p>
          </div>
        </div>
        <div className="w3-col s12 m4">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-blue">
              <FaUser />
            </div>
            <h3 className="w3-text-blue">
              {new Set(pendingApprovals.map(req => req.userId)).size}
            </h3>
            <p>申請者数</p>
          </div>
        </div>
        <div className="w3-col s12 m4">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-green">
              <FaCalendarCheck />
            </div>
            <h3 className="w3-text-green">
              {pendingApprovals.reduce((sum, req) => sum + req.days, 0)}
            </h3>
            <p>申請総日数</p>
          </div>
        </div>
      </div>

      {/* 承認待ちリスト */}
      <div className="w3-card w3-white w3-round">
        <div className="w3-container w3-padding w3-border-bottom">
          <h3>承認待ち申請一覧</h3>
          {loading && <p><i className="fa fa-spinner fa-spin"></i> 読み込み中...</p>}
        </div>

        {pendingApprovals.length === 0 && !loading ? (
          <div className="w3-container w3-padding w3-center">
            <div className="w3-margin w3-xlarge w3-text-grey">
              <FaHourglassHalf />
            </div>
            <h3 className="w3-text-grey">承認待ちの申請がありません</h3>
            <p>現在処理が必要な申請はありません。</p>
          </div>
        ) : (
          <div className="w3-container w3-padding">
            {pendingApprovals.map((request, index) => (
              <div key={request.id} className="w3-card w3-white w3-margin-bottom w3-border w3-round">
                <div className="w3-container w3-padding">
                  <div className="w3-row">
                    <div className="w3-col s12 m8">
                      <h4 className="w3-margin-bottom">
                        <FaUser className="w3-margin-right w3-text-blue" />
                        {request.user.firstName} {request.user.lastName}
                      </h4>
                      
                      <div className="w3-row-padding w3-small">
                        <div className="w3-col s12 m6">
                          <p><b>休暇種類:</b> 
                            <span className="w3-tag w3-blue w3-round w3-margin-left">
                              {getLeaveTypeLabel(request.leaveType || request.type)}
                            </span>
                          </p>
                          <p><b>申請日数:</b> {request.days}日</p>
                        </div>
                        <div className="w3-col s12 m6">
                          <p><b>開始日:</b> {formatDate(request.startDate)}</p>
                          <p><b>終了日:</b> {formatDate(request.endDate)}</p>
                        </div>
                      </div>
                      
                      <p><b>理由:</b> {request.reason}</p>
                      <p className="w3-small w3-text-grey">
                        申請日時: {new Date(request.requestedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    
                    <div className="w3-col s12 m4 w3-center">
                      <div className="w3-margin-top">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="w3-button w3-blue w3-round w3-margin-bottom w3-block"
                        >
                          <FaEye className="w3-margin-right" />
                          詳細確認
                        </button>
                        
                        <button
                          onClick={() => handleApproval(request.id, 'approve')}
                          className="w3-button w3-green w3-round w3-margin-bottom w3-block w3-hover-shadow"
                        >
                          <FaCheck className="w3-margin-right" />
                          承認
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setRejectReason('');
                          }}
                          className="w3-button w3-red w3-round w3-block w3-hover-shadow"
                        >
                          <FaTimes className="w3-margin-right" />
                          却下
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedRequest && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-card w3-animate-zoom" style={{ maxWidth: '600px' }}>
            <div className="w3-container w3-blue w3-padding">
              <h3>申請詳細</h3>
              <span
                onClick={() => setSelectedRequest(null)}
                className="w3-button w3-display-topright w3-blue w3-hover-red"
              >
                &times;
              </span>
            </div>
            
            <div className="w3-container w3-padding">
              <div className="w3-row-padding">
                <div className="w3-col s12">
                  <h4>{selectedRequest.user.firstName} {selectedRequest.user.lastName}</h4>
                  <p><b>メールアドレス:</b> {selectedRequest.user.email}</p>
                  
                  <div className="w3-panel w3-pale-blue w3-border w3-round">
                    <h5>申請内容</h5>
                    <p><b>休暇種類:</b> {getLeaveTypeLabel(selectedRequest.leaveType || selectedRequest.type)}</p>
                    <p><b>期間:</b> {formatDate(selectedRequest.startDate)} ～ {formatDate(selectedRequest.endDate)}</p>
                    <p><b>日数:</b> {selectedRequest.days}日</p>
                    <p><b>理由:</b> {selectedRequest.reason}</p>
                  </div>
                  
                  {/* 却下理由入力 */}
                  <div className="w3-margin-top">
                    <label className="w3-text-grey"><b>却下理由（却下する場合のみ）</b></label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w3-input w3-border w3-round"
                      rows="3"
                      placeholder="却下理由を入力してください..."
                    />
                  </div>
                  
                  <div className="w3-margin-top w3-center">
                    <button
                      onClick={() => handleApproval(selectedRequest.id, 'approve')}
                      className="w3-button w3-green w3-margin-right w3-round"
                    >
                      <FaCheck className="w3-margin-right" />
                      承認
                    </button>
                    <button
                      onClick={() => handleApproval(selectedRequest.id, 'reject')}
                      className="w3-button w3-red w3-round"
                    >
                      <FaTimes className="w3-margin-right" />
                      却下
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default LeaveApprovalManagement;
