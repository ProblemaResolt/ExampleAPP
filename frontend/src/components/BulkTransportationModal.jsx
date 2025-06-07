import React, { useState } from 'react';
import { FaCar, FaTimes, FaSave, FaCalendarAlt, FaDollarSign, FaBusinessTime, FaCalendar } from 'react-icons/fa';

const BulkTransportationModal = ({ isOpen, onClose, onSave, currentMonth, currentYear }) => {
  const [amount, setAmount] = useState(0);
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const [applyToWorkingDaysOnly, setApplyToWorkingDaysOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  // 月の営業日数を取得
  const getWorkingDaysInMonth = () => {
    const year = currentYear;
    const month = currentMonth - 1; // JavaScript の月は0ベース
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      // 土日を除く（0=日曜日, 6=土曜日）
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  };

  // 月の全日数を取得
  const getAllDaysInMonth = () => {
    const year = currentYear;
    const month = currentMonth - 1; // JavaScript の月は0ベース
    return new Date(year, month + 1, 0).getDate();
  };

  const workingDays = getWorkingDaysInMonth();
  const allDays = getAllDaysInMonth();
  // 保存処理
  const handleSave = async () => {
    if (amount <= 0) {
      alert('交通費を入力してください');
      return;
    }

    try {
      setLoading(true);
      
      // 親コンポーネントのsaveBulkTransportation関数を呼び出し
      await onSave({
        amount: amount,
        year: currentYear,
        month: currentMonth,
        applyToAllDays,
        applyToWorkingDaysOnly
      });

    } catch (error) {
      console.error('交通費一括設定に失敗しました:', error);
      alert('交通費一括設定に失敗しました。もう一度お試しください。');
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
            {currentYear}年{currentMonth}月の交通費を一括で設定します（営業日数: {workingDays}日、全日数: {allDays}日）
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

          {/* 適用範囲設定 */}
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col s12">
              <label className="w3-text-black">
                <FaCalendar className="w3-margin-right" />
                <strong>適用範囲</strong>
              </label>
              
              <div className="w3-margin-top">
                <label className="w3-block w3-margin-bottom">
                  <input
                    type="radio"
                    className="w3-radio"
                    name="applyRange"
                    checked={applyToWorkingDaysOnly}
                    onChange={() => {
                      setApplyToWorkingDaysOnly(true);
                      setApplyToAllDays(false);
                    }}
                  />
                  <span className="w3-margin-left">営業日のみ（土日を除く）- {workingDays}日間</span>
                </label>
                
                <label className="w3-block">
                  <input
                    type="radio"
                    className="w3-radio"
                    name="applyRange"
                    checked={applyToAllDays}
                    onChange={() => {
                      setApplyToAllDays(true);
                      setApplyToWorkingDaysOnly(false);
                    }}
                  />
                  <span className="w3-margin-left">全日（土日含む）- {allDays}日間</span>
                </label>
              </div>
            </div>
          </div>

          {/* 合計金額表示 */}
          <div className="w3-panel w3-leftbar w3-light-blue w3-border-blue">
            <h4>設定予定金額</h4>
            <p>
              <strong>
                月間合計: ¥{(amount * (applyToAllDays ? allDays : workingDays)).toLocaleString()}
              </strong>
              <br />
              <span className="w3-text-grey">
                （¥{amount.toLocaleString()} × {applyToAllDays ? allDays : workingDays}日間）
              </span>
            </p>
          </div>

          {/* 注意事項 */}
          <div className="w3-panel w3-leftbar w3-pale-yellow w3-border-orange">
            <h4>注意事項</h4>
            <ul className="w3-ul">
              <li>既に設定済みの交通費は上書きされます</li>
              <li>個別に変更したい日がある場合は、後から勤怠表で個別編集してください</li>
              <li>出勤記録のある日のみに交通費が設定されます</li>
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
    </div>
  );
};

export default BulkTransportationModal;
