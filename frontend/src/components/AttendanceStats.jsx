import React from 'react';
import { FaChartBar } from 'react-icons/fa';

const AttendanceStats = ({ monthlyStats, currentDate }) => {
  console.log('📊 AttendanceStats received monthlyStats:', monthlyStats);
  console.log('📊 AttendanceStats - lateCount specifically:', monthlyStats?.lateCount);
  console.log('📊 AttendanceStats - all stats keys:', Object.keys(monthlyStats || {}));
  console.log('📊 AttendanceStats - Current date:', currentDate);
  console.log('📊 AttendanceStats - Year/Month:', currentDate.getFullYear(), currentDate.getMonth() + 1);
  
  return (
    <div className="w3-card-4 w3-white w3-margin-bottom">
      <header className="w3-container w3-blue w3-padding">
        <h3>
          <FaChartBar className="w3-margin-right" />
          {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 勤務統計
        </h3>
      </header>
  
      <div className="work-statistics w3-container w3-padding">
        <ul> 
          <li>
            <div className="w3-card w3-light-blue w3-padding">
              <h4>出勤日数</h4>
              <div>
                {monthlyStats.workDays || 0}
              </div>
            </div>
          </li>
          <li>
            <div className="w3-card w3-light-green w3-padding">
              <h4>総勤務時間</h4>
              <div>
                {Math.floor(monthlyStats.totalHours || 0)}:{Math.round(((monthlyStats.totalHours || 0) % 1) * 60).toString().padStart(2, '0')}
              </div>
            </div>
          </li>
          <li>
            <div className="w3-card w3-light-orange w3-padding">
              <h4>残業時間</h4>
              <div>
                {Math.floor(monthlyStats.overtimeHours || 0)}:{Math.round(((monthlyStats.overtimeHours || 0) % 1) * 60).toString().padStart(2, '0')}
              </div>
            </div>
          </li>
          <li>
            <div className="w3-card w3-light-red w3-padding">
              <h4>休暇日数</h4>
              <div>
                {monthlyStats.leaveDays || 0}
              </div>
            </div>
          </li>          <li>
            <div className="w3-card w3-light-purple w3-padding">
              <h4>遅刻回数</h4>
              <div>
                {monthlyStats.lateCount || 0}
              </div>
            </div>
          </li>
          <li>
            <div className="w3-card w3-light-yellow w3-padding">
              <h4>交通費</h4>
              <div>
                ¥{(monthlyStats.transportationCost || 0).toLocaleString()}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AttendanceStats;
