import React from 'react';
import { 
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCog, 
  FaDownload, FaCalendarCheck, FaCar, FaSyncAlt 
} from 'react-icons/fa';

const AttendanceNavigation = ({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth,
  onBulkSettings,
  onExport,
  onLeaveForm,
  onBulkTransportation,
  onRefresh
}) => {
  return (
    <>
      {/* 月ナビゲーション */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <div className="w3-container w3-padding">
          <div className="w3-bar">
            <button 
              className="w3-bar-item w3-button w3-blue"
              onClick={onPreviousMonth}
            >
              <FaChevronLeft /> 前月
            </button>
            
            <div className="w3-bar-item w3-center" style={{ width: '60%' }}>
              <h3>
                <FaCalendarAlt className="w3-margin-right" />
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
              </h3>
            </div>
            
            <button 
              className="w3-bar-item w3-button w3-blue"
              onClick={onNextMonth}
            >
              次月 <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <div className="w3-container w3-padding">
          <div className="w3-bar">
            <button 
              className="w3-bar-item w3-button w3-green"
              onClick={onBulkSettings}
            >
              <FaCog className="w3-margin-right" />
              一括設定
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-orange"
              onClick={onExport}
            >
              <FaDownload className="w3-margin-right" />
              エクスポート
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-purple"
              onClick={onLeaveForm}
            >
              <FaCalendarCheck className="w3-margin-right" />
              休暇申請
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-brown"
              onClick={onBulkTransportation}
            >
              <FaCar className="w3-margin-right" />
              交通費一括登録
            </button>
            
            <button 
              className="w3-bar-item w3-button w3-teal"
              onClick={onRefresh}
            >
              <FaSyncAlt className="w3-margin-right" />
              更新
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendanceNavigation;
