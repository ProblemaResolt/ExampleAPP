import React, { useState, useEffect } from 'react';
import { FaCalendarPlus, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../utils/axios';

const LeaveRequestForm = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    leaveType: 'PAID_LEAVE',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'MORNING'
  });
  
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);

  const leaveTypes = [
    { value: 'PAID_LEAVE', label: '有給休暇', icon: '🏖️' },
    { value: 'SICK_LEAVE', label: '病気休暇', icon: '🏥' },
    { value: 'PERSONAL_LEAVE', label: '私用休暇', icon: '👤' },
    { value: 'MATERNITY', label: '産前産後休暇', icon: '👶' },
    { value: 'PATERNITY', label: '育児休暇', icon: '👨‍👩‍👧' },
    { value: 'SPECIAL', label: '特別休暇', icon: '⭐' },
    { value: 'UNPAID', label: '無給休暇', icon: '📅' }
  ];

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const response = await api.get('/leave/leave-balance');
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('残高取得エラー:', error);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) return 0;
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculateDays(),
        reason: formData.reason
      };

      await api.post('/leave/leave-request', requestData);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('申請エラー:', error);
      alert(error.response?.data?.message || '申請の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      leaveType: 'PAID_LEAVE',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      halfDayType: 'MORNING'
    });
  };

  return (
    <div className="w3-card w3-white w3-round w3-margin">
      {/* ヘッダー */}
      <div className="w3-container w3-blue w3-padding">
        <div className="w3-row">
          <div className="w3-col">
            <button 
              onClick={onBack}
              className="w3-button w3-blue w3-hover-white w3-hover-text-blue w3-round-small"
            >
              <FaArrowLeft className="w3-margin-right" />
              戻る
            </button>
          </div>
          <div className="w3-col w3-center">
            <h3><FaCalendarPlus className="w3-margin-right" />休暇申請</h3>
          </div>
          <div className="w3-col w3-right-align">
            <button 
              onClick={resetForm}
              className="w3-button w3-blue w3-hover-white w3-hover-text-blue w3-round-small"
            >
              <FaTimes className="w3-margin-right" />
              クリア
            </button>
          </div>
        </div>
      </div>

      <div className="w3-container w3-padding-large">
        {/* 残高表示 */}
        {leaveBalance && leaveBalance.leaveBalances && leaveBalance.leaveBalances.length > 0 && (
          <div className="w3-panel w3-pale-blue w3-border w3-round-large w3-margin-bottom">
            <h4>📊 有給残高</h4>
            <div className="w3-row-padding">
              {leaveBalance.leaveBalances.map((balance, index) => (
                <div key={index} className="w3-col s12 m6 l4">
                  <div className="w3-card w3-white w3-padding w3-center w3-round">
                    <h5>{balance.leaveType === 'PAID_LEAVE' ? '有給休暇' : balance.leaveType}</h5>
                    <div className="w3-xlarge w3-text-blue">
                      {balance.remainingDays}日
                    </div>
                    <small className="w3-text-grey">
                      総日数: {balance.totalDays}日 / 使用済み: {balance.usedDays}日
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 申請フォーム */}
        <form onSubmit={handleSubmit} className="w3-row-padding">
          <div className="w3-col s12 m6">
            {/* 休暇種類 */}
            <div className="w3-margin-bottom">
              <label className="w3-text-grey"><b>休暇種類</b></label>
              <div className="w3-margin-top">
                {leaveTypes.map(type => (
                  <label key={type.value} className="w3-margin-right w3-margin-bottom w3-block">
                    <input
                      type="radio"
                      name="leaveType"
                      value={type.value}
                      checked={formData.leaveType === type.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                      className="w3-radio w3-margin-right"
                    />
                    <span className="w3-large">{type.icon}</span> {type.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 半日休暇オプション */}
            <div className="w3-margin-bottom">
              <label className="w3-margin-right">
                <input
                  type="checkbox"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, isHalfDay: e.target.checked }))}
                  className="w3-check w3-margin-right"
                />
                半日休暇
              </label>
              
              {formData.isHalfDay && (
                <div className="w3-margin-top">
                  <label className="w3-margin-right">
                    <input
                      type="radio"
                      name="halfDayType"
                      value="MORNING"
                      checked={formData.halfDayType === 'MORNING'}
                      onChange={(e) => setFormData(prev => ({ ...prev, halfDayType: e.target.value }))}
                      className="w3-radio w3-margin-right"
                    />
                    午前休
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="halfDayType"
                      value="AFTERNOON"
                      checked={formData.halfDayType === 'AFTERNOON'}
                      onChange={(e) => setFormData(prev => ({ ...prev, halfDayType: e.target.value }))}
                      className="w3-radio w3-margin-right"
                    />
                    午後休
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="w3-col s12 m6">
            {/* 開始日 */}
            <div className="w3-margin-bottom">
              <label className="w3-text-grey"><b>開始日</b></label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w3-input w3-border w3-round"
                required
              />
            </div>

            {/* 終了日 */}
            {!formData.isHalfDay && (
              <div className="w3-margin-bottom">
                <label className="w3-text-grey"><b>終了日</b></label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w3-input w3-border w3-round"
                  min={formData.startDate}
                  required
                />
              </div>
            )}

            {/* 日数表示 */}
            <div className="w3-panel w3-pale-green w3-border w3-round">
              <p><b>申請日数: {calculateDays()}日</b></p>
            </div>
          </div>

          <div className="w3-col s12">
            {/* 理由 */}
            <div className="w3-margin-bottom">
              <label className="w3-text-grey"><b>理由</b></label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w3-input w3-border w3-round"
                rows="4"
                placeholder="休暇の理由を入力してください..."
                required
              />
            </div>

            {/* 送信ボタン */}
            <div className="w3-center w3-margin-top">
              <button
                type="submit"
                disabled={loading || !formData.startDate || !formData.reason.trim()}
                className="w3-button w3-blue w3-large w3-round w3-hover-shadow"
              >
                {loading ? (
                  <>
                    <i className="fa fa-spinner fa-spin w3-margin-right"></i>
                    送信中...
                  </>
                ) : (
                  <>
                    <FaSave className="w3-margin-right" />
                    申請を送信
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
