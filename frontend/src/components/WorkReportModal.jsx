import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaFile, FaClipboardList, FaStar, FaExclamationTriangle, FaCalendarDay } from 'react-icons/fa';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const WorkReportModal = ({ onClose, date, timeEntry, updateWorkReport, onSave }) => {
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    workSummary: '',
    achievements: '',
    challenges: '',
    nextDayPlan: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (timeEntry) {
      setFormData({
        workSummary: timeEntry.workSummary || '',
        achievements: timeEntry.achievements || '',
        challenges: timeEntry.challenges || '',
        nextDayPlan: timeEntry.nextDayPlan || ''
      });
    }
  }, [timeEntry]);

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
  };  const handleSave = async () => {
    setIsLoading(true);
    try {
      // updateWorkReport関数を使用して業務レポートを保存
      await updateWorkReport({
        date: date,
        ...formData
      });
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
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '800px' }}>
        {/* ヘッダー */}
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

        {/* フォーム内容 */}
        <div className="w3-container w3-padding">
          {/* 業務内容サマリー */}
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>業務内容サマリー *</b></label>
            <textarea
              value={formData.workSummary}
              onChange={(e) => handleInputChange('workSummary', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              rows="4"
              placeholder="今日の主要な業務内容を簡潔に記載してください"
              required
            />
          </div>

          {/* 成果・達成事項 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>成果・達成事項</b></label>
            <textarea
              value={formData.achievements}
              onChange={(e) => handleInputChange('achievements', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              rows="3"
              placeholder="完了したタスクや達成した成果を記載してください"
            />
          </div>

          {/* 課題・問題点 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>課題・問題点</b></label>
            <textarea
              value={formData.challenges}
              onChange={(e) => handleInputChange('challenges', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              rows="3"
              placeholder="遭遇した課題や問題点、改善が必要な事項を記載してください"
            />
          </div>

          {/* 翌日の予定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>翌日の予定・計画</b></label>
            <textarea
              value={formData.nextDayPlan}
              onChange={(e) => handleInputChange('nextDayPlan', e.target.value)}
              className="w3-input w3-border w3-margin-top"
              rows="3"
              placeholder="明日取り組む予定のタスクや目標を記載してください"
            />
          </div>
        </div>

        {/* フッター */}
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
