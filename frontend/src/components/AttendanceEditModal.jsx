import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaClock, FaDollarSign, FaCoffee } from 'react-icons/fa';
import TimeIntervalPicker from './TimeIntervalPicker';

const AttendanceEditModal = ({ 
  config,
  onClose, 
  onSave, 
  workSettings
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (config?.show) {
      setInputValue(config.currentValue || '');
    }
  }, [config]);

  const handleSave = () => {
    onSave(inputValue);
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

  const getIcon = () => {
    switch (config?.field) {
      case 'clockIn':
      case 'clockOut':
        return <FaClock className="w3-margin-right" />;
      case 'breakTime':
        return <FaCoffee className="w3-margin-right" />;
      case 'transportationCost':
        return <FaDollarSign className="w3-margin-right" />;
      default:
        return <FaClock className="w3-margin-right" />;
    }
  };

  const getInputType = () => {
    switch (config?.field) {
      case 'clockIn':
      case 'clockOut':
        return 'time';
      case 'breakTime':
      case 'transportationCost':
        return 'number';
      default:
        return 'text';
    }
  };

  const getInputProps = () => {
    const baseProps = {
      value: inputValue,
      onChange: (e) => setInputValue(e.target.value),
      className: "w3-input w3-border w3-margin-top",
      autoFocus: true
    };    switch (config?.field) {
      case 'breakTime':
        return {
          ...baseProps,
          min: 0,
          max: 480,
          step: 15,
          placeholder: "分単位で入力"
        };
      case 'transportationCost':
        return {
          ...baseProps,
          min: 0,
          step: 10,
          placeholder: "円単位で入力"
        };
      default:
        return baseProps;
    }
  };

  const getFieldDescription = () => {
    switch (config?.field) {
      case 'clockIn':
        return '出勤時刻を設定してください';
      case 'clockOut':
        return '退勤時刻を設定してください';
      case 'breakTime':
        return '休憩時間を分単位で入力してください';
      case 'transportationCost':
        return '交通費を円単位で入力してください';
      default:
        return '';
    }
  };

  if (!config?.show) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '500px' }}>
        {/* ヘッダー */}        <header className="w3-container w3-blue">
          <button
            onClick={onClose}
            className="w3-button w3-blue w3-xlarge w3-display-topright"
          >
            ×
          </button>          <h2>
            {getIcon()}
            {config?.label || config?.field}
          </h2>
          <p className="w3-margin-bottom">{formatDate(config?.dateString)}</p>
        </header>
        
        {/* フォーム内容 */}
        <div className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>{config?.label || config?.field}</b></label>
            <p className="w3-text-grey w3-small">{getFieldDescription()}</p>
              {/* 時間入力の場合はカスタムピッカーを使用 */}
            {(config?.field === 'clockIn' || config?.field === 'clockOut') ? (
              <TimeIntervalPicker
                value={inputValue}                onChange={(value) => {
                  setInputValue(value);
                }}
                interval={workSettings?.timeInterval || 15}
                startHour={0}
                endHour={23}
                placeholder={`${config?.field === 'clockIn' ? '出勤' : '退勤'}時刻を選択`}
                className="w3-input w3-border w3-margin-top"
              />
            ) : (
              <input
                type={getInputType()}
                {...getInputProps()}
              />
            )}            
            {config?.field === 'breakTime' && (
              <p className="w3-text-grey w3-tiny w3-margin-top">
                例: 60 (1時間), 90 (1時間30分)
              </p>
            )}
            {config?.field === 'transportationCost' && (
              <p className="w3-text-grey w3-tiny w3-margin-top">
                例: 500, 1000
              </p>
            )}
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
    </div>
  );
};

export default AttendanceEditModal;
