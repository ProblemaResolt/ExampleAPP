import React from 'react';
import { FaClock, FaCalendarCheck, FaCalendarAlt, FaUsers, FaChartBar } from 'react-icons/fa';

const AttendanceTabNavigation = ({ activeTab, setActiveTab, userRole }) => {
  return (
    <div className="w3-bar w3-card w3-white w3-margin-bottom">
      <button
        className={`w3-bar-item w3-button ${activeTab === 'attendance' ? 'w3-blue' : 'w3-white'}`}
        onClick={() => setActiveTab('attendance')}
      >
        <FaCalendarCheck className="w3-margin-right" />
        勤怠記録
      </button>
      <button
        className={`w3-bar-item w3-button ${activeTab === 'leave' ? 'w3-blue' : 'w3-white'}`}
        onClick={() => setActiveTab('leave')}
      >
        <FaCalendarAlt className="w3-margin-right" />
        休暇管理
      </button>
      <button
        className={`w3-bar-item w3-button ${activeTab === 'stats' ? 'w3-blue' : 'w3-white'}`}
        onClick={() => setActiveTab('stats')}
      >
        <FaChartBar className="w3-margin-right" />
        勤務統計
      </button>      {(userRole === 'ADMIN' || userRole === 'COMPANY' || userRole === 'MANAGER') && (
        <button
          className={`w3-bar-item w3-button ${activeTab === 'settings' ? 'w3-blue' : 'w3-white'}`}
          onClick={() => setActiveTab('settings')}
        >
          <FaUsers className="w3-margin-right" />
          勤務設定管理
        </button>
      )}
      {(userRole === 'ADMIN' || userRole === 'COMPANY') && (
        <button
          className={`w3-bar-item w3-button ${activeTab === 'leaveBalance' ? 'w3-blue' : 'w3-white'}`}
          onClick={() => setActiveTab('leaveBalance')}
        >
          <FaCalendarCheck className="w3-margin-right" />
          有給残高管理
        </button>
      )}
    </div>
  );
};

export default AttendanceTabNavigation;
