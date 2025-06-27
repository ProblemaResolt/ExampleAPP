import React from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * 月次ナビゲーションコンポーネント
 */
const MonthNavigation = ({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth,
  showYearMonth = true 
}) => {
  const formatDate = (date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  return (
    <div className="w3-card w3-margin-bottom">
      <div className="w3-container w3-blue w3-padding">
        <div className="w3-row w3-center">
          <div className="w3-col" style={{ width: '80px' }}>
            <button
              className="w3-button w3-white w3-text-blue w3-round"
              onClick={onPreviousMonth}
              title="前月"
            >
              <FaChevronLeft />
            </button>
          </div>
          
          <div className="w3-col" style={{ width: 'calc(100% - 160px)' }}>
            <h3 className="w3-center w3-margin-top w3-margin-bottom">
              <FaCalendarAlt className="w3-margin-right" />
              {showYearMonth && formatDate(currentDate)}
            </h3>
          </div>
          
          <div className="w3-col" style={{ width: '80px' }}>
            <button
              className="w3-button w3-white w3-text-blue w3-round"
              onClick={onNextMonth}
              title="次月"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthNavigation;
