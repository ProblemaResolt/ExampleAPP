import React from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import StatusBadge from '../common/StatusBadge';

/**
 * 勤怠詳細モーダルコンポーネント
 * @param {object} entry - 勤怠記録
 * @param {boolean} isOpen - モーダル表示状態
 * @param {function} onClose - 閉じるハンドラー
 * @param {function} onApproval - 承認ハンドラー
 * @param {boolean} isLoading - ローディング状態
 */
const AttendanceDetailModal = ({
  entry,
  isOpen,
  onClose,
  onApproval,
  isLoading
}) => {
  if (!isOpen || !entry) {
    return null;
  }

  const formatWorkHours = (hours) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}時間${m}分`;
  };

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-top">
        <div className="w3-container">
          <span
            onClick={onClose}
            className="w3-button w3-display-topright"
            style={{ cursor: 'pointer' }}
          >
            &times;
          </span>
          <h3>勤怠記録詳細</h3>
          
          <div className="w3-row-padding">
            <div className="w3-col m6">
              <p><strong>社員:</strong> {entry.user.lastName} {entry.user.firstName}</p>
              <p><strong>日付:</strong> {format(new Date(entry.date), 'yyyy年MM月dd日 (E)', { locale: ja })}</p>
              <p><strong>出勤時間:</strong> {entry.clockIn ? format(new Date(entry.clockIn), 'HH:mm') : '-'}</p>
              <p><strong>退勤時間:</strong> {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '-'}</p>
              <p><strong>勤務時間:</strong> {formatWorkHours(entry.workHours)}</p>
            </div>
            <div className="w3-col m6">
              <p><strong>ステータス:</strong> <StatusBadge status={entry.status} /></p>
              {entry.user.position && (
                <p><strong>役職:</strong> {entry.user.position}</p>
              )}
              {entry.user.email && (
                <p><strong>メール:</strong> {entry.user.email}</p>
              )}
            </div>
          </div>

          {/* メモ・作業内容など */}
          {(entry.note || entry.workSummary || entry.achievements || entry.challenges || entry.nextDayPlan) && (
            <div className="w3-margin-top">
              <h4>追加情報</h4>
              {entry.note && (
                <div className="w3-margin-bottom">
                  <strong>メモ:</strong>
                  <div className="w3-panel w3-pale-blue w3-leftbar w3-border-blue">
                    {entry.note}
                  </div>
                </div>
              )}
              {entry.workSummary && (
                <div className="w3-margin-bottom">
                  <strong>作業内容:</strong>
                  <div className="w3-panel w3-pale-green w3-leftbar w3-border-green">
                    {entry.workSummary}
                  </div>
                </div>
              )}
              {entry.achievements && (
                <div className="w3-margin-bottom">
                  <strong>成果:</strong>
                  <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-yellow">
                    {entry.achievements}
                  </div>
                </div>
              )}
              {entry.challenges && (
                <div className="w3-margin-bottom">
                  <strong>課題:</strong>
                  <div className="w3-panel w3-pale-red w3-leftbar w3-border-red">
                    {entry.challenges}
                  </div>
                </div>
              )}
              {entry.nextDayPlan && (
                <div className="w3-margin-bottom">
                  <strong>翌日の予定:</strong>
                  <div className="w3-panel w3-pale-purple w3-leftbar w3-border-purple">
                    {entry.nextDayPlan}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 承認・却下ボタン */}
          <div className="w3-margin-top w3-padding-top w3-border-top">
            <button
              className="w3-button w3-green w3-margin-right"
              onClick={() => onApproval(entry, 'APPROVED')}
              disabled={isLoading}
            >
              <FaCheck className="w3-margin-right" />承認
            </button>
            <button
              className="w3-button w3-red w3-margin-right"
              onClick={() => onApproval(entry, 'REJECTED')}
              disabled={isLoading}
            >
              <FaTimes className="w3-margin-right" />却下
            </button>
            <button
              className="w3-button w3-gray"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;
