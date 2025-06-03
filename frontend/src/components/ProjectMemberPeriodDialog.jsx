import React, { useState, useEffect } from 'react';
import { FaCalendar } from 'react-icons/fa';

const ProjectMemberPeriodDialog = ({ 
  open, 
  onClose, 
  member, 
  project, 
  onSave, 
  projectStartDate, 
  projectEndDate 
}) => {
  const [startDate, setStartDate] = useState(member?.projectMembership?.startDate || '');
  const [endDate, setEndDate] = useState(member?.projectMembership?.endDate || '');
  const [error, setError] = useState(null);

  // 日付フォーマット関数
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // 日付の制約を設定
  const minStartDate = formatDateForInput(projectStartDate);
  const maxEndDate = projectEndDate ? formatDateForInput(projectEndDate) : '';

  useEffect(() => {
    if (open) {
      setStartDate(formatDateForInput(member?.projectMembership?.startDate) || '');
      setEndDate(formatDateForInput(member?.projectMembership?.endDate) || '');
      setError(null);
    }
  }, [open, member]);

  const handleSave = () => {
    // バリデーション
    if (!startDate) {
      setError('開始日は必須です');
      return;
    }

    if (endDate && new Date(startDate) > new Date(endDate)) {
      setError('終了日は開始日より後の日付を設定してください');
      return;
    }

    if (new Date(startDate) < new Date(projectStartDate)) {
      setError('開始日はプロジェクトの開始日以降に設定してください');
      return;
    }

    if (projectEndDate && endDate && new Date(endDate) > new Date(projectEndDate)) {
      setError('終了日はプロジェクトの終了日以前に設定してください');
      return;
    }

    onSave({
      startDate: startDate,
      endDate: endDate
    });
  };

  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-top w3-card-4">
        <div className="w3-container w3-blue">
          <span 
            onClick={onClose}
            className="w3-button w3-display-topright"
          >
            &times;
          </span>
          <h4>
            <FaCalendar className="w3-margin-right" />
            {member?.firstName} {member?.lastName}の期間を編集
          </h4>
        </div>
        
        <div className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>開始日</b></label>
            <input
              type="date"
              className="w3-input w3-border w3-round-large"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError(null);
              }}
              min={minStartDate}
              max={maxEndDate || undefined}
            />
          </div>
          
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>終了日</b></label>
            <input
              type="date"
              className="w3-input w3-border w3-round-large"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError(null);
              }}
              min={startDate || minStartDate}
              max={maxEndDate || undefined}
            />
          </div>

          {error && (
            <div className="w3-panel w3-red w3-round-large w3-margin-bottom">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="w3-container w3-border-top w3-padding-16 w3-light-grey">
          <div className="w3-bar w3-right">
            <button 
              className="w3-button w3-white w3-border w3-round-large w3-margin-right"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button 
              className="w3-button w3-blue w3-round-large"
              onClick={handleSave}
            >
              保存
            </button>
          </div>
          <div className="w3-clear"></div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMemberPeriodDialog;