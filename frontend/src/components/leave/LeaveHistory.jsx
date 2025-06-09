import React, { useState, useEffect } from 'react';
import { FaHistory, FaCalendar, FaFilter, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../../utils/axios';

const LeaveHistory = ({ userId, userRole }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    startDate: '',
    endDate: ''
  });
  const [selectedRequest, setSelectedRequest] = useState(null);

  const leaveTypes = [
    { value: '', label: '全ての種類' },
    { value: 'PAID_LEAVE', label: '有給休暇' },
    { value: 'SICK_LEAVE', label: '病気休暇' },
    { value: 'PERSONAL_LEAVE', label: '私用休暇' },
    { value: 'MATERNITY', label: '産前産後休暇' },
    { value: 'PATERNITY', label: '育児休暇' },
    { value: 'SPECIAL', label: '特別休暇' },
    { value: 'UNPAID', label: '無給休暇' }
  ];

  const statusOptions = [
    { value: '', label: '全てのステータス' },
    { value: 'PENDING', label: '承認待ち' },
    { value: 'APPROVED', label: '承認済み' },
    { value: 'REJECTED', label: '却下' }
  ];

  useEffect(() => {
    fetchLeaveRequests();
  }, [filters]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const params = { userId };
      if (filters.status) params.status = filters.status;
      if (filters.leaveType) params.leaveType = filters.leaveType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await api.get('/leave/leave-requests', { params });
      setLeaveRequests(response.data.data?.leaveRequests || []);
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!confirm('この申請を削除しますか？')) return;
    
    try {
      await api.delete(`/leave/leave-request/${requestId}`);
      alert('申請を削除しました');
      fetchLeaveRequests();
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error.response?.data?.message || '削除に失敗しました');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': 'w3-yellow w3-text-black',
      'APPROVED': 'w3-green',
      'REJECTED': 'w3-red'
    };
    const labels = {
      'PENDING': '承認待ち',
      'APPROVED': '承認済み',
      'REJECTED': '却下'
    };
    
    return (
      <span className={`w3-tag w3-round ${badges[status] || 'w3-grey'}`}>
        {labels[status] || status}
      </span>
    );
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

  const getStatistics = () => {
    const stats = {
      total: leaveRequests.length,
      pending: leaveRequests.filter(req => req.status === 'PENDING').length,
      approved: leaveRequests.filter(req => req.status === 'APPROVED').length,
      rejected: leaveRequests.filter(req => req.status === 'REJECTED').length,
      totalDays: leaveRequests.filter(req => req.status === 'APPROVED').reduce((sum, req) => sum + req.days, 0)
    };
    return stats;
  };

  const stats = getStatistics();

  return (
    <div className="w3-container">
      {/* ヘッダー */}
      <div className="w3-card w3-blue w3-padding w3-margin-bottom w3-round">
        <h2><FaHistory className="w3-margin-right" />休暇申請履歴</h2>
        <p>あなたの休暇申請の履歴を確認できます</p>
      </div>

      {/* 統計カード */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-blue">
              <FaCalendar />
            </div>
            <h3 className="w3-text-blue">{stats.total}</h3>
            <p>総申請数</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-orange">
              <FaHistory />
            </div>
            <h3 className="w3-text-orange">{stats.pending}</h3>
            <p>承認待ち</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-green">
              ✓
            </div>
            <h3 className="w3-text-green">{stats.approved}</h3>
            <p>承認済み</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-purple">
              📅
            </div>
            <h3 className="w3-text-purple">{stats.totalDays}</h3>
            <p>取得日数</p>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="w3-card w3-white w3-padding w3-margin-bottom w3-round">
        <h4><FaFilter className="w3-margin-right" />フィルター</h4>
        <div className="w3-row-padding">
          <div className="w3-col s12 m3">
            <label className="w3-text-grey"><b>ステータス</b></label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w3-select w3-border w3-round"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w3-col s12 m3">
            <label className="w3-text-grey"><b>休暇種類</b></label>
            <select
              value={filters.leaveType}
              onChange={(e) => setFilters(prev => ({ ...prev, leaveType: e.target.value }))}
              className="w3-select w3-border w3-round"
            >
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w3-col s12 m3">
            <label className="w3-text-grey"><b>開始日以降</b></label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w3-input w3-border w3-round"
            />
          </div>
          <div className="w3-col s12 m3">
            <label className="w3-text-grey"><b>終了日以前</b></label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w3-input w3-border w3-round"
            />
          </div>
        </div>
      </div>

      {/* 申請リスト */}
      <div className="w3-card w3-white w3-round">
        <div className="w3-container w3-padding w3-border-bottom">
          <h3>申請一覧</h3>
          {loading && <p><i className="fa fa-spinner fa-spin"></i> 読み込み中...</p>}
        </div>

        {leaveRequests.length === 0 && !loading ? (
          <div className="w3-container w3-padding w3-center">
            <div className="w3-margin w3-xlarge w3-text-grey">
              <FaHistory />
            </div>
            <h3 className="w3-text-grey">申請履歴がありません</h3>
            <p>まだ休暇申請をしていません。</p>
          </div>
        ) : (
          <div className="w3-container">
            {leaveRequests.map((request, index) => (
              <div key={request.id} className="w3-row w3-padding w3-border-bottom w3-hover-light-grey">
                <div className="w3-col s12 m8">
                  <div className="w3-row">
                    <div className="w3-col s12 m6">
                      <h5>{getLeaveTypeLabel(request.leaveType || request.type)}</h5>
                      <p className="w3-small w3-text-grey">
                        {formatDate(request.startDate)} ～ {formatDate(request.endDate)}
                      </p>
                    </div>
                    <div className="w3-col s12 m6">
                      <p><b>{request.days}日</b></p>
                      <p className="w3-small">{request.reason}</p>
                    </div>
                  </div>
                </div>
                <div className="w3-col s12 m4 w3-center">
                  <div className="w3-margin-top">
                    {getStatusBadge(request.status)}
                    <div className="w3-margin-top">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="w3-button w3-small w3-blue w3-round w3-margin-right"
                      >
                        <FaEye />
                      </button>
                      {request.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => console.log('編集機能は別途実装')}
                            className="w3-button w3-small w3-orange w3-round w3-margin-right"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="w3-button w3-small w3-red w3-round"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}
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
              <div className="w3-panel w3-pale-blue w3-border w3-round">
                <h5>申請内容</h5>
                <p><b>休暇種類:</b> {getLeaveTypeLabel(selectedRequest.leaveType || selectedRequest.type)}</p>
                <p><b>期間:</b> {formatDate(selectedRequest.startDate)} ～ {formatDate(selectedRequest.endDate)}</p>
                <p><b>日数:</b> {selectedRequest.days}日</p>
                <p><b>理由:</b> {selectedRequest.reason}</p>
                <p><b>ステータス:</b> {getStatusBadge(selectedRequest.status)}</p>
              </div>
              
              <div className="w3-panel w3-pale-grey w3-border w3-round">
                <h5>申請情報</h5>
                <p><b>申請日時:</b> {new Date(selectedRequest.requestedAt).toLocaleString('ja-JP')}</p>
                {selectedRequest.approvedAt && (
                  <p><b>承認日時:</b> {new Date(selectedRequest.approvedAt).toLocaleString('ja-JP')}</p>
                )}
                {selectedRequest.rejectedAt && (
                  <p><b>却下日時:</b> {new Date(selectedRequest.rejectedAt).toLocaleString('ja-JP')}</p>
                )}
                {selectedRequest.approver && (
                  <p><b>承認者:</b> {selectedRequest.approver.firstName} {selectedRequest.approver.lastName}</p>
                )}
                {selectedRequest.rejectReason && (
                  <p><b>却下理由:</b> {selectedRequest.rejectReason}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveHistory;
