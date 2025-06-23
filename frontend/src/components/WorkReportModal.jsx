import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaFile } from 'react-icons/fa';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const STATUS_OPTIONS = [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'
];

const WorkReportModal = ({ onClose, date, timeEntry, timeEntryId, updateWorkReport, onSave }) => {
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    timeEntryId: timeEntryId || '',
    description: '',
    status: 'NOT_STARTED'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // statusがSTATUS_OPTIONSに含まれていない場合は'NOT_STARTED'に強制
    const validStatus = STATUS_OPTIONS.includes(timeEntry?.status) ? timeEntry?.status : 'NOT_STARTED';
    setFormData({
      id: timeEntry?.id ? timeEntry.id : undefined, // idがなければundefined
      timeEntryId: timeEntry?.timeEntryId || timeEntryId || '',
      description: timeEntry?.description || '',
      status: validStatus
    });
  }, [timeEntry, timeEntryId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleSave = async () => {
    if (!formData.timeEntryId) {
      showError('勤怠レコードID（timeEntryId）がありません。保存できません。');
      return;
    }
    if (!formData.description) {
      showError('作業内容は必須です');
      return;
    }
    if (!formData.status) {
      showError('ステータスは必須です');
      return;
    }
    setIsLoading(true);
    try {
      // idが「undefined」「null」「空文字列」ならPOST、それ以外はPUT
      // workHoursは送信しない
      const { workHours, ...restFormData } = formData;
      const payload = {
        date: date,
        ...restFormData,
        duration: 0 // duration必須
      };
      if (payload.id) {
        await updateWorkReport({ ...payload, id: payload.id }); // PUT
      } else {
        const { id, ...postPayload } = payload;
        await updateWorkReport(postPayload); // POST
      }
      onSave();
    } catch (error) {
      console.error('業務レポート保存エラー:', error);
      showError('保存中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <button
            onClick={onClose}
            className="w3-button w3-blue w3-xlarge w3-display-topright"
          >
            ×
          </button>
          <h2>
            <FaFile className="w3-margin-right" />
            業務レポート
          </h2>
          <p className="w3-margin-bottom">{formatDate(date)}</p>
        </header>
        <div className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>作業内容 *</b></label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              rows="4"
              placeholder="作業内容を記載してください"
              required
            />
          </div>
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>ステータス *</b></label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              required
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <footer className="w3-container w3-padding w3-light-grey">
          <button
            onClick={onClose}
            className="w3-button w3-grey w3-margin-right"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="w3-button w3-blue"
            disabled={isLoading || !formData.timeEntryId}
          >
            <FaSave className="w3-margin-right" />
            保存
          </button>
        </footer>
      </div>
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default WorkReportModal;
