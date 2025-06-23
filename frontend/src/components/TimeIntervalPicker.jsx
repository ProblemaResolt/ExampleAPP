import React, { useState, useEffect } from 'react';
import { FaClock, FaRegClock } from 'react-icons/fa';

const TimeIntervalPicker = ({ 
  value, 
  onChange, 
  interval = 15, // 15分または30分刻み
  startHour = 0, // 24時間対応: 0時から
  endHour = 23,  // 23時まで
  placeholder = "時間を選択",
  className = "w3-input w3-border"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(value || '');

  useEffect(() => {
    setSelectedTime(value || '');
  }, [value]);
  // 現在時刻を取得する関数
  const getCurrentTime = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = Math.floor(now.getMinutes() / interval) * interval; // インターバルに合わせて丸める
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // 時間のオプション生成（24時間対応）
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();
  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    onChange(time);
    setIsOpen(false);
  };

  const formatDisplayTime = (time) => {
    if (!time) return placeholder;
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}`;
  };
  return (
    <div className="time-interval-picker" style={{ position: 'relative' }}>      {/* 入力フィールド */}
      <div
        className={`${className} w3-hover-light-grey`}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '8px 12px',
          backgroundColor: isOpen ? '#f0f8ff' : 'white'
        }}
      >
        <span style={{ color: selectedTime ? 'black' : '#999' }}>
          {formatDisplayTime(selectedTime)}
        </span>
        <FaClock className="w3-text-grey" />
      </div>      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div 
          className="w3-white w3-card-4"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            border: '1px solid #ccc',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* 現在の時間ボタン */}
          <div
            className="w3-hover-light-blue w3-border-bottom"
            onClick={(e) => {
              e.stopPropagation();
              const currentTime = getCurrentTime();
              handleTimeSelect(currentTime);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f8ff',
              cursor: 'pointer',
              borderBottom: '2px solid #2196F3',
              color: '#2196F3',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaRegClock />
            現在の時間 ({getCurrentTime()})
          </div>
          
          {timeOptions.map((time) => (
            <div
              key={time}
              className="w3-hover-light-grey"
              onClick={(e) => {
                e.stopPropagation();
                handleTimeSelect(time);
              }}
              style={{ 
                padding: '8px 16px',
                backgroundColor: selectedTime === time ? '#e1f5fe' : 'white',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              {time}
            </div>
          ))}
        </div>
      )}{/* 背景クリックで閉じる */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TimeIntervalPicker;
