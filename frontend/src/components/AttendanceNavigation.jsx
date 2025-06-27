import React from 'react';
import { 
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCog, 
  FaDownload, FaCalendarCheck, FaCar, FaSyncAlt, FaTable
} from 'react-icons/fa';

const AttendanceNavigation = ({ 
  title, // 追加
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
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1.5rem',
        width: '100%',
        justifyContent: 'flex-start'
      }}
    >
      {/* タイトル */}
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <FaTable className="w3-margin-right" />
          <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>{title}</h3>
        </div>
      )}
      {/* 月ナビゲーション */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="w3-button w3-white w3-hover-blue"
          onClick={onPreviousMonth}
        >
          <FaChevronLeft /> 前月
        </button>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>
          <FaCalendarAlt className="w3-margin-right" />
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h3>
        <button
          className="w3-button w3-white w3-hover-blue"
          onClick={onNextMonth}
        >
          次月 <FaChevronRight />
        </button>
      </div>
      {/* 操作ボタン群 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="w3-button w3-green" onClick={onBulkSettings}>
          <FaCog className="w3-margin-right" /> 一括設定
        </button>
        <button className="w3-button w3-orange" onClick={onExport}>
          <FaDownload className="w3-margin-right" /> エクスポート
        </button>
        <button className="w3-button w3-purple" onClick={onLeaveForm}>
          <FaCalendarCheck className="w3-margin-right" /> 休暇申請
        </button>
        <button className="w3-button w3-brown" onClick={onBulkTransportation}>
          <FaCar className="w3-margin-right" /> 交通費一括登録
        </button>
        <button className="w3-button w3-teal" onClick={onRefresh}>
          <FaSyncAlt className="w3-margin-right" /> 更新
        </button>
      </div>
    </div>
  );
};

export default AttendanceNavigation;
