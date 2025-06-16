import React, { useState } from 'react';
import { FaCar, FaTimes, FaSave, FaCalendarAlt, FaDollarSign, FaBusinessTime, FaCalendar } from 'react-icons/fa';
import { isWeekendDay } from '../utils/weekendHelper';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const BulkTransportationModal = ({ isOpen, onClose, onSave, currentMonth, currentYear, workSettings }) => {
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();
  // 月の営業日数を取得（プロジェクト設定に基づく週末判定）
  const getWorkingDaysInMonth = () => {
    const year = currentYear;
    const month = currentMonth - 1; // JavaScript の月は0ベース
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    const weekStartDay = workSettings?.weekStartDay || 1; // デフォルトは月曜日

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // プロジェクト設定に基づく週末判定
      if (!isWeekendDay(date, weekStartDay)) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const workingDays = getWorkingDaysInMonth();
  // 保存処理
  const handleSave = async () => {
    if (amount <= 0) {
      showError('交通費を入力してください');
      return;
    }

    try {
      setLoading(true);
      
      // 親コンポーネントのsaveBulkTransportation関数を呼び出し
      const result = await onSave({
        amount: amount,
        year: currentYear,
        month: currentMonth
      });

      // 成功時
      showSuccess(result || '交通費一括設定が完了しました');
      onClose(); // モーダルを閉じる

    } catch (error) {
      console.error('交通費一括設定に失敗しました:', error);
      showError(`交通費一括設定に失敗しました: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px', margin: '5% auto' }}>
        {/* ヘッダー */}
        <header className="w3-container w3-brown">
          <span 
            className="w3-button w3-display-topright w3-hover-red"
            onClick={onClose}
          >
            <FaTimes />
          </span>
          <h2>
            <FaCar className="w3-margin-right" />
            交通費一括設定
          </h2>
          <p className="w3-margin-bottom">
            {currentYear}年{currentMonth}月の交通費を一括で設定します（営業日数: {workingDays}日）
          </p>
        </header>

        {/* コンテンツ */}
        <div className="w3-container w3-padding">
          {/* 金額設定 */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col s12">
              <label className="w3-text-black">
                <FaDollarSign className="w3-margin-right" />
                <strong>1日あたりの交通費（円）</strong>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="w3-input w3-border w3-margin-top"
                placeholder="例: 500"
                min="0"
                step="10"
              />
              <p className="w3-text-grey w3-small">
                通勤1日あたりの交通費を円単位で入力してください
              </p>
            </div>
          </div>

          {/* 適用範囲の説明 */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col s12">
              <label className="w3-text-black">
                <FaCalendar className="w3-margin-right" />
                <strong>適用範囲</strong>
              </label>
              
              <div className="w3-panel w3-leftbar w3-pale-blue w3-border-blue w3-margin-top">
                <p>
                  <strong>営業日のみ（土日を除く）- {workingDays}日間</strong><br/>
                  <span className="w3-text-grey w3-small">
                    土曜日・日曜日は自動的に除外されます
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 合計金額表示 */}
          <div className="w3-panel w3-leftbar w3-light-blue w3-border-blue">
            <h4>設定予定金額</h4>
            <p>
              <strong>
                月間合計: ¥{(amount * workingDays).toLocaleString()}
              </strong>
              <br />
              <span className="w3-text-grey">
                （¥{amount.toLocaleString()} × {workingDays}営業日）
              </span>
            </p>
          </div>

          {/* 注意事項 */}
          <div className="w3-panel w3-leftbar w3-pale-yellow w3-border-orange">
            <h4>注意事項</h4>
            <ul className="w3-ul">
              <li>営業日（土日を除く平日）のみに交通費が設定されます</li>
              <li>既に設定済みの交通費は上書きされます</li>
              <li>個別に変更したい日がある場合は、後から勤怠表で個別編集してください</li>
              <li>勤怠記録のない日には新規に記録が作成されます</li>
            </ul>
          </div>
        </div>

        {/* フッター */}
        <footer className="w3-container w3-padding w3-light-grey">
          <button
            onClick={onClose}
            className="w3-button w3-grey w3-margin-right"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="w3-button w3-brown"
            disabled={loading || amount <= 0}
          >
            {loading ? (
              <span>
                <i className="fa fa-spinner fa-spin w3-margin-right"></i>
                設定中...
              </span>
            ) : (
              <span>
                <FaSave className="w3-margin-right" />
                一括設定
              </span>
            )}
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

export default BulkTransportationModal;
