import React, { useState } from 'react';
import { FaSave, FaTimes, FaCog, FaCoffee, FaClock, FaBusinessTime, FaHourglass } from 'react-icons/fa';

const BulkSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  workSettings,
  currentMonth,
  currentYear 
}) => {
  // 時間選択肢を生成するヘルパー関数
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  // 休憩時間選択肢を生成（15分刻み）
  const generateBreakTimeOptions = () => {
    const options = [];
    for (let minutes = 0; minutes <= 480; minutes += 15) {
      options.push(minutes);
    }
    return options;
  };

  // 残業閾値選択肢を生成（0.5時間刻み、最大45時間）
  const generateOvertimeOptions = () => {
    const options = [];
    for (let hours = 0; hours <= 45; hours += 0.5) {
      options.push(hours);
    }
    return options;
  };

  const [settings, setSettings] = useState({
    defaultWorkHours: 8,
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    defaultBreakTime: 60,
    defaultOvertimeThreshold: 0,
    interval15Minutes: true,
    interval30Minutes: false,
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

  const handleIntervalChange = (interval) => {
    setSettings(prev => ({
      ...prev,
      interval15Minutes: interval === 15,
      interval30Minutes: interval === 30
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '600px' }}>
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
        </header>        {/* フォーム内容 */}
        <div className="w3-container w3-padding">
          {/* デフォルト勤務時間設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaBusinessTime className="w3-margin-right" />
              <b>デフォルト勤務時間</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <input
                  type="number"
                  className="w3-input w3-border"
                  value={settings.defaultWorkHours}
                  onChange={(e) => handleInputChange('defaultWorkHours', parseInt(e.target.value))}
                  min="1"
                  max="24"
                  step="0.5"
                />
              </div>
              <div className="w3-col s4 w3-padding-left">
                <span className="w3-text-grey">時間</span>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              1日の標準勤務時間を設定します
            </p>
          </div>

          {/* デフォルト開始時間設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaClock className="w3-margin-right" />
              <b>デフォルト開始時間</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <select
                  className="w3-select w3-border"
                  value={settings.defaultStartTime}
                  onChange={(e) => handleInputChange('defaultStartTime', e.target.value)}
                >
                  {generateTimeOptions().map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              新規エントリのデフォルト開始時間を設定します（15分間隔）
            </p>
          </div>

          {/* デフォルト終了時間設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaClock className="w3-margin-right" />
              <b>デフォルト終了時間</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <select
                  className="w3-select w3-border"
                  value={settings.defaultEndTime}
                  onChange={(e) => handleInputChange('defaultEndTime', e.target.value)}
                >
                  {generateTimeOptions().map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              新規エントリのデフォルト終了時間を設定します（15分間隔）
            </p>
          </div>

          {/* デフォルト休憩時間設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaCoffee className="w3-margin-right" />
              <b>デフォルト休憩時間</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <select
                  className="w3-select w3-border"
                  value={settings.defaultBreakTime}
                  onChange={(e) => handleInputChange('defaultBreakTime', parseInt(e.target.value))}
                >
                  {generateBreakTimeOptions().map(minutes => (
                    <option key={minutes} value={minutes}>
                      {minutes === 0 ? '0分' : `${minutes}分`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              新規エントリのデフォルト休憩時間を設定します（15分間隔）
            </p>
          </div>

          {/* デフォルト残業閾値設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaHourglass className="w3-margin-right" />
              <b>デフォルト残業閾値</b>
            </label>
            <div className="w3-row w3-margin-top">
              <div className="w3-col s8">
                <select
                  className="w3-select w3-border"
                  value={settings.defaultOvertimeThreshold}
                  onChange={(e) => handleInputChange('defaultOvertimeThreshold', parseFloat(e.target.value))}
                >
                  {generateOvertimeOptions().map(hours => (
                    <option key={hours} value={hours}>
                      {hours === 0 ? '0時間' : `${hours}時間`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="w3-text-grey w3-tiny">
              残業時間の閾値を設定します（0.5時間間隔、最大45時間）
            </p>
          </div>

          {/* 時間入力間隔設定 */}
          <div className="w3-margin-bottom">
            <label className="w3-text-indigo">
              <FaClock className="w3-margin-right" />
              <b>時間入力間隔</b>
            </label>
            <div className="w3-margin-top">
              <input
                type="checkbox"
                id="interval15"
                checked={settings.interval15Minutes}
                onChange={() => handleIntervalChange(15)}
                className="w3-check"
              />
              <label htmlFor="interval15" className="w3-margin-left w3-margin-right">15分間隔</label>
              
              <input
                type="checkbox"
                id="interval30"
                checked={settings.interval30Minutes}
                onChange={() => handleIntervalChange(30)}
                className="w3-check"
              />
              <label htmlFor="interval30" className="w3-margin-left">30分間隔</label>
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
