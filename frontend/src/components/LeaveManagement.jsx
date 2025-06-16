import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaCalendarPlus, FaList, FaCheck, FaTimes, FaHourglassHalf, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const LeaveManagement = ({ userId, userRole }) => {
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState('request');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);  const [newRequest, setNewRequest] = useState({
    type: 'PAID_LEAVE',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'MORNING'
  });// 既存のaxiosクライアントを使用したAPI関数
  const leaveAPI = {
    createLeaveRequest: (data) => api.post('/leave/leave-request', data),
    getLeaveRequests: (params) => api.get('/leave/leave-requests', { params }),
    getLeaveBalance: (params) => api.get('/leave/leave-balance', { params }),
    getPendingApprovals: (params) => api.get('/leave/leave-requests', { params }),
    approveLeaveRequest: (requestId, data) => api.patch(`/leave/leave-request/${requestId}/approve`, data),
    deleteLeaveRequest: (requestId) => api.delete(`/leave/leave-request/${requestId}`),
  };const leaveTypes = [
    { value: 'PAID_LEAVE', label: '有給休暇', color: 'w3-blue' },
    { value: 'SICK_LEAVE', label: '病気休暇', color: 'w3-red' },
    { value: 'PERSONAL_LEAVE', label: '私用休暇', color: 'w3-orange' },
    { value: 'MATERNITY', label: '産前産後休暇', color: 'w3-pink' },
    { value: 'PATERNITY', label: '育児休暇', color: 'w3-purple' },
    { value: 'SPECIAL', label: '特別休暇', color: 'w3-grey' },
    { value: 'UNPAID', label: '無給休暇', color: 'w3-green' }
  ];

  const statusColors = {
    PENDING: 'w3-yellow',
    APPROVED: 'w3-green',
    REJECTED: 'w3-red'
  };

  const statusLabels = {
    PENDING: '承認待ち',
    APPROVED: '承認済み',
    REJECTED: '却下'
  };

  useEffect(() => {
    fetchData();
  }, [userId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'request' || activeTab === 'list') {
        await fetchLeaveRequests();
        await fetchLeaveBalance();
      }
      
      if (activeTab === 'approval' && (userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'COMPANY')) {
        await fetchPendingApprovals();
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };  const fetchLeaveRequests = async () => {
    try {
      const response = await leaveAPI.getLeaveRequests({ userId });
      setLeaveRequests(response.data.data?.leaveRequests || []);
    } catch (error) {
      console.error('休暇申請取得エラー:', error);
    }
  };
  const fetchLeaveBalance = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await leaveAPI.getLeaveBalance({ userId, year: currentYear });
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('休暇残高取得エラー:', error);
    }
  };  const fetchPendingApprovals = async () => {
    try {
      // COMPANY権限の場合は、自社の全ユーザーの承認待ち申請を取得
      const params = { status: 'PENDING' };
      if (userRole !== 'COMPANY' && userRole !== 'ADMIN') {
        // MANAGER権限の場合は部下の申請のみ、一般ユーザーは自分の申請のみ
        params.userId = userId;
      }
      
      const response = await api.get('/leave/leave-requests', { params });
      setPendingApprovals(response.data.data?.leaveRequests || []);
    } catch (error) {
      console.error('承認待ち取得エラー:', error);
    }
  };
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason.trim()) {
      showError('必須項目を入力してください');
      return;
    }

    // バックエンドAPIに送信するデータ形式を作成
    const requestData = {
      leaveType: newRequest.type, // type -> leaveType に変換
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      days: calculateLeaveDays(), // 日数を計算して追加
      reason: newRequest.reason,
      // 半日休暇の場合の追加情報（バックエンドで対応する場合）
      isHalfDay: newRequest.isHalfDay,
      halfDayType: newRequest.halfDayType
    };

    try {
      await leaveAPI.createLeaveRequest(requestData);      setNewRequest({
        type: 'PAID_LEAVE',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayType: 'MORNING'
      });
      setShowRequestForm(false);
      await fetchLeaveRequests();
      await fetchLeaveBalance();
      showSuccess('休暇申請を送信しました');
    } catch (error) {
      console.error('休暇申請エラー:', error);
      showError('申請に失敗しました');
    }
  };  const handleApproval = async (requestId, action, comments = '') => {
    try {
      const apiAction = action === 'APPROVED' ? 'approve' : 'reject';
      await leaveAPI.approveLeaveRequest(requestId, { action: apiAction, rejectReason: comments });
      await fetchPendingApprovals();
      showSuccess(`申請を${action === 'APPROVED' ? '承認' : '却下'}しました`);
    } catch (error) {
      console.error('承認処理エラー:', error);
      showError('処理に失敗しました');
    }
  };

  const calculateLeaveDays = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    
    const start = new Date(newRequest.startDate);
    const end = new Date(newRequest.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return newRequest.isHalfDay ? 0.5 : diffDays;
  };

  const getLeaveTypeInfo = (type) => {
    return leaveTypes.find(lt => lt.value === type) || leaveTypes[0];
  };

  return (
    <div className="w3-container">
      {/* タブナビゲーション */}
      <div className="w3-bar w3-light-grey w3-margin-bottom">
        <button
          className={`w3-bar-item w3-button ${activeTab === 'request' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <FaCalendarPlus className="w3-margin-right" />
          休暇申請
        </button>
        <button
          className={`w3-bar-item w3-button ${activeTab === 'list' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <FaList className="w3-margin-right" />
          申請履歴
        </button>        {(userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'COMPANY') && (
          <button
            className={`w3-bar-item w3-button ${activeTab === 'approval' ? 'w3-blue' : ''}`}
            onClick={() => setActiveTab('approval')}
          >
            <FaCheck className="w3-margin-right" />
            承認管理
          </button>
        )}
      </div>

      {loading && (
        <div className="w3-center w3-padding-large">
          <i className="fa fa-spinner fa-spin fa-2x"></i>
          <p>読み込み中...</p>
        </div>
      )}

      {/* 休暇申請タブ */}
      {activeTab === 'request' && !loading && (
        <div>          {/* 休暇残高表示 */}
          {leaveBalance && leaveBalance.leaveBalances && leaveBalance.leaveBalances.length > 0 && (
            <div className="w3-card w3-white w3-margin-bottom">
              <header className="w3-container w3-blue">
                <h4>休暇残高 ({leaveBalance.year}年)</h4>
              </header>
              <div className="w3-container w3-padding">
                <div className="w3-row">
                  {leaveBalance.leaveBalances.map((balance) => {
                    const getBalanceLabel = (type) => {
                      switch(type) {
                        case 'PAID_LEAVE': return '有給休暇残日数';
                        case 'SICK_LEAVE': return '病気休暇残日数';
                        case 'PERSONAL_LEAVE': return '私用休暇残日数';
                        default: return '休暇残日数';
                      }
                    };
                    
                    const getBalanceColor = (type) => {
                      switch(type) {
                        case 'PAID_LEAVE': return 'w3-text-blue';
                        case 'SICK_LEAVE': return 'w3-text-red';
                        case 'PERSONAL_LEAVE': return 'w3-text-orange';
                        default: return 'w3-text-grey';
                      }
                    };
                    
                    return (
                      <div key={balance.leaveType} className="w3-col s6 m3">
                        <div className="w3-center">
                          <h3 className={getBalanceColor(balance.leaveType)}>{balance.remainingDays}</h3>
                          <p>{getBalanceLabel(balance.leaveType)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 申請フォーム */}
          {!showRequestForm ? (
            <div className="w3-card w3-white w3-center w3-padding-large">
              <button
                className="w3-button w3-blue w3-large"
                onClick={() => setShowRequestForm(true)}
              >
                <FaCalendarPlus className="w3-margin-right" />
                新しい休暇申請
              </button>
            </div>
          ) : (
            <div className="w3-card w3-white">
              <header className="w3-container w3-blue">
                <h4>休暇申請フォーム</h4>
              </header>
              <form onSubmit={handleSubmitRequest} className="w3-container w3-padding">
                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>休暇種別:</strong></label>
                    <select
                      className="w3-select w3-border w3-margin-top"
                      value={newRequest.type}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, type: e.target.value }))}
                    >
                      {leaveTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey">
                      <input
                        type="checkbox"
                        className="w3-check w3-margin-right"
                        checked={newRequest.isHalfDay}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, isHalfDay: e.target.checked }))}
                      />
                      半日休暇
                    </label>
                    
                    {newRequest.isHalfDay && (
                      <select
                        className="w3-select w3-border w3-margin-top"
                        value={newRequest.halfDayType}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, halfDayType: e.target.value }))}
                      >
                        <option value="MORNING">午前休</option>
                        <option value="AFTERNOON">午後休</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>開始日:</strong></label>
                    <input
                      type="date"
                      className="w3-input w3-border w3-margin-top"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>終了日:</strong></label>
                    <input
                      type="date"
                      className="w3-input w3-border w3-margin-top"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                      min={newRequest.startDate}
                      required
                    />
                  </div>
                </div>

                <div className="w3-margin-bottom">
                  <label className="w3-text-grey"><strong>申請理由:</strong></label>
                  <textarea
                    className="w3-input w3-border w3-margin-top"
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="休暇の理由を入力してください"
                    rows="3"
                    required
                  />
                </div>

                {newRequest.startDate && newRequest.endDate && (
                  <div className="w3-panel w3-pale-blue w3-border-blue">
                    <p><strong>申請日数: {calculateLeaveDays()}日</strong></p>
                  </div>
                )}

                <div className="w3-margin-top">
                  <button type="submit" className="w3-button w3-blue w3-margin-right">
                    <FaCheck className="w3-margin-right" />
                    申請送信
                  </button>
                  <button
                    type="button"
                    className="w3-button w3-light-grey"
                    onClick={() => setShowRequestForm(false)}
                  >
                    <FaTimes className="w3-margin-right" />
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 申請履歴タブ */}
      {activeTab === 'list' && !loading && (
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-grey">
            <h4>休暇申請履歴</h4>
          </header>
          <div className="w3-container w3-padding">
            {leaveRequests.length === 0 ? (
              <p className="w3-center w3-text-grey">申請履歴がありません</p>
            ) : (
              <div className="w3-responsive">
                <table className="w3-table w3-striped w3-bordered">
                  <thead>
                    <tr className="w3-light-grey">
                      <th>申請日</th>
                      <th>種別</th>
                      <th>期間</th>
                      <th>日数</th>
                      <th>理由</th>
                      <th>ステータス</th>
                    </tr>
                  </thead>
                  <tbody>                    {leaveRequests.map((request) => {
                      const typeInfo = getLeaveTypeInfo(request.leaveType || request.type);
                      return (
                        <tr key={request.id}>
                          <td>{new Date(request.createdAt).toLocaleDateString('ja-JP')}</td>
                          <td>
                            <span className={`w3-tag ${typeInfo.color} w3-small`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td>
                            {new Date(request.startDate).toLocaleDateString('ja-JP')} - 
                            {new Date(request.endDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td>{request.days}日</td>
                          <td>{request.reason}</td>
                          <td>
                            <span className={`w3-tag ${statusColors[request.status]} w3-small`}>
                              {request.status === 'PENDING' && <FaHourglassHalf className="w3-margin-right" />}
                              {request.status === 'APPROVED' && <FaCheck className="w3-margin-right" />}
                              {request.status === 'REJECTED' && <FaTimes className="w3-margin-right" />}
                              {statusLabels[request.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}      {/* 承認管理タブ */}
      {activeTab === 'approval' && !loading && (userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'COMPANY') && (
        <div className="w3-card w3-white">
          <header className="w3-container w3-orange">
            <h4>承認待ち申請</h4>
          </header>
          <div className="w3-container w3-padding">
            {pendingApprovals.length === 0 ? (
              <p className="w3-center w3-text-grey">承認待ちの申請がありません</p>
            ) : (
              pendingApprovals.map((request) => {
                const typeInfo = getLeaveTypeInfo(request.leaveType || request.type);
                return (
                  <div key={request.id} className="w3-card w3-border w3-margin-bottom">
                    <div className="w3-container w3-padding">
                      <div className="w3-row">
                        <div className="w3-col s12 m8">                          <h5>
                            {request.user?.name || 
                             (request.user?.lastName && request.user?.firstName 
                               ? `${request.user.lastName} ${request.user.firstName}` 
                               : (request.lastName && request.firstName 
                                   ? `${request.lastName} ${request.firstName}`
                                   : '不明なユーザー'))
                            }
                            <span className={`w3-tag ${typeInfo.color} w3-small w3-margin-left`}>
                              {typeInfo.label}
                            </span>
                          </h5>
                          <p>
                            <strong>期間:</strong> {new Date(request.startDate).toLocaleDateString('ja-JP')} - 
                            {new Date(request.endDate).toLocaleDateString('ja-JP')} ({request.days}日)
                          </p>
                          <p><strong>理由:</strong> {request.reason}</p>
                          <p className="w3-small w3-text-grey">
                            申請日: {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div className="w3-col s12 m4">
                          <button
                            className="w3-button w3-green w3-block w3-margin-bottom"
                            onClick={() => handleApproval(request.id, 'APPROVED')}
                          >
                            <FaCheck className="w3-margin-right" />
                            承認
                          </button>
                          <button
                            className="w3-button w3-red w3-block"
                            onClick={() => {
                              const comments = prompt('却下理由を入力してください:');
                              if (comments) {
                                handleApproval(request.id, 'REJECTED', comments);
                              }
                            }}
                          >
                            <FaTimes className="w3-margin-right" />
                            却下
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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

export default LeaveManagement;
