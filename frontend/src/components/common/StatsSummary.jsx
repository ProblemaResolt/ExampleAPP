import React from 'react';
import { FaClock, FaUser, FaCalendarCheck, FaExclamationTriangle } from 'react-icons/fa';

/**
 * 統計カードコンポーネント
 */
const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'w3-blue', 
  textColor = 'w3-white',
  onClick = null
}) => {
  const cardClass = onClick ? 'w3-card w3-hover-shadow w3-button' : 'w3-card';
  
  return (
    <div 
      className={`${cardClass} ${color} ${textColor} w3-margin-bottom`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <div className="w3-container w3-padding">
        <div className="w3-row">
          <div className="w3-col" style={{ width: 'calc(100% - 60px)' }}>
            <h3 className="w3-margin-bottom">{value}</h3>
            <h4 className="w3-margin-bottom w3-opacity">{title}</h4>
            {subtitle && (
              <p className="w3-small w3-opacity">{subtitle}</p>
            )}
          </div>
          <div className="w3-col w3-center" style={{ width: '60px' }}>
            <div className="w3-padding w3-xxlarge">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 統計サマリーコンポーネント
 */
const StatsSummary = ({ stats }) => {
  const {
    totalWorkingDays = 0,
    attendedDays = 0,
    lateArrivals = 0,
    averageWorkingHours = 0,
    totalWorkingHours = 0,
    pendingApprovals = 0
  } = stats || {};

  const attendanceRate = totalWorkingDays > 0 
    ? ((attendedDays / totalWorkingDays) * 100).toFixed(1)
    : 0;

  return (
    <div className="w3-row-padding w3-margin-bottom">
      <div className="w3-col m3">
        <StatsCard
          title="出勤日数"
          value={`${attendedDays}/${totalWorkingDays}日`}
          subtitle={`出勤率: ${attendanceRate}%`}
          icon={<FaCalendarCheck />}
          color="w3-green"
        />
      </div>
      
      <div className="w3-col m3">
        <StatsCard
          title="総労働時間"
          value={`${totalWorkingHours.toFixed(1)}h`}
          subtitle={`平均: ${averageWorkingHours.toFixed(1)}h/日`}
          icon={<FaClock />}
          color="w3-blue"
        />
      </div>
      
      <div className="w3-col m3">
        <StatsCard
          title="遅刻回数"
          value={`${lateArrivals}回`}
          subtitle={totalWorkingDays > 0 ? `${((lateArrivals / totalWorkingDays) * 100).toFixed(1)}%` : '0%'}
          icon={<FaExclamationTriangle />}
          color={lateArrivals > 0 ? 'w3-orange' : 'w3-gray'}
        />
      </div>
      
      {pendingApprovals !== undefined && (
        <div className="w3-col m3">
          <StatsCard
            title="承認待ち"
            value={`${pendingApprovals}件`}
            subtitle="承認が必要な申請"
            icon={<FaUser />}
            color={pendingApprovals > 0 ? 'w3-red' : 'w3-gray'}
          />
        </div>
      )}
    </div>
  );
};

export default StatsSummary;
export { StatsCard };
