import React, { useState } from 'react';
import { FaSave, FaTimes, FaCog, FaCoffee, FaDollarSign, FaClock } from 'react-icons/fa';
import TimeIntervalPicker from './TimeIntervalPicker';

const BulkSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  workSettings,
  currentMonth,
  currentYear 
}) => {
  const [settings, setSettings] = useState({
    defaultBreakTime: workSettings.breakTime || 60,
    defaultTransportationCost: 0,
    timeInterval: 15, // 15分または30分刻み
    applyToExistingEntries: false,
    applyToFutureDates: true
  });

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px' }}>
        {/* ヘッダー */}
        <header className="w3-container w3-indigo">
          <button
            onClick={onClose}
            className="w3-button w3-indigo w3-xlarge w3-display-topright"
          >
            ×
          </button>
          <h2>
            <FaCog className="w3-margin-right" />
            一括設定
          </h2>
          <p className="w3-margin-bottom">
            {currentYear}年{currentMonth}月の勤怠設定
          </p>
        </header>

        {/* フォーム内容 */}
        <div className="w3-container w3-padding">
          {/* デフォルト休憩時間設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaCoffee className="w3-margin-right" />
              <b>デフォルト休憩時間</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <input
                  type="number"
                  className="w3-input w3-border"
                  value={settings.defaultBreakTime}
                  onChange={(e) => handleInputChange('defaultBreakTime', parseInt(e.target.value))}
                  min="0"
                  max="480"
                  step="15"
                />
              </div>
              <div className="w3-col s4 w3-padding-left">
                <span className="w3-text-grey">分</span>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              新規エントリのデフォルト休憩時間を設定します
            </p>
          </div>

          {/* デフォルト交通費設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaDollarSign className="w3-margin-right" />
              <b>デフォルト交通費</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <input
                  type="number"
                  className="w3-input w3-border"
                  value={settings.defaultTransportationCost}
                  onChange={(e) => handleInputChange('defaultTransportationCost', parseInt(e.target.value))}
                  min="0"
                  step="10"
                />
              </div>
              <div className="w3-col s4 w3-padding-left">
                <span className="w3-text-grey">円</span>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              新規エントリのデフォルト交通費を設定します
            </p>
          </div>

          {/* 時間間隔設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaClock className="w3-margin-right" />
              <b>時間入力間隔</b>
            </label>
            <div className="w3-margin-top">
              <input
                type="radio"
                id="interval15"
                name="timeInterval"
                value="15"
                checked={settings.timeInterval === 15}
                onChange={(e) => handleInputChange('timeInterval', parseInt(e.target.value))}
                className="w3-radio"
              />
              <label htmlFor="interval15" className="w3-margin-left w3-margin-right">15分刻み</label>
              
              <input
                type="radio"
                id="interval30"
                name="timeInterval"
                value="30"
                checked={settings.timeInterval === 30}
                onChange={(e) => handleInputChange('timeInterval', parseInt(e.target.value))}
                className="w3-radio"
              />
              <label htmlFor="interval30" className="w3-margin-left">30分刻み</label>
            </div>
            <p className="w3-text-grey w3-tiny">
              出勤・退勤時間の入力間隔を設定します
            </p>
          </div>

          {/* 適用オプション */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo"><b>適用オプション</b></label>
            <div className="w3-margin-top">
              <input
                type="checkbox"
                id="applyExisting"
                checked={settings.applyToExistingEntries}
                onChange={(e) => handleInputChange('applyToExistingEntries', e.target.checked)}
                className="w3-check"
              />
              <label htmlFor="applyExisting" className="w3-margin-left">
                既存のエントリにも適用する
              </label>
            </div>
            <div className="w3-margin-top">
              <input
                type="checkbox"
                id="applyFuture"
                checked={settings.applyToFutureDates}
                onChange={(e) => handleInputChange('applyToFutureDates', e.target.checked)}
                className="w3-check"
              />
              <label htmlFor="applyFuture" className="w3-margin-left">
                今後の新規エントリに適用する
              </label>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="w3-container w3-padding w3-light-grey">
          <button
            onClick={onClose}
            className="w3-button w3-grey w3-margin-right"
          >
            <FaTimes className="w3-margin-right" />
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="w3-button w3-indigo"
          >
            <FaSave className="w3-margin-right" />
            適用
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BulkSettingsModal;
