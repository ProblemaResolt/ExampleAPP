import React from 'react';
import { FaFilter, FaSearch } from 'react-icons/fa';

/**
 * 勤怠フィルターコンポーネント
 * @param {object} filters - フィルター値
 * @param {function} onFilterChange - フィルター変更ハンドラー
 * @param {function} onApplyFilters - フィルター適用ハンドラー
 * @param {boolean} showUserFilter - ユーザーフィルターを表示するか
 */
const AttendanceFilters = ({ 
  filters, 
  onFilterChange, 
  onApplyFilters,
  showUserFilter = false 
}) => {
  const handleFilterChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value,
      page: 1 // フィルター変更時はページをリセット
    });
  };

  return (
    <div className="w3-card-4 w3-margin-bottom">
      <div className="w3-container w3-padding">
        <h4><FaFilter className="w3-margin-right" />フィルター</h4>
        <div className="w3-row-padding">
          <div className="w3-col m3">
            <label>開始日:</label>
            <input
              type="date"
              className="w3-input w3-border"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="w3-col m3">
            <label>終了日:</label>
            <input
              type="date"
              className="w3-input w3-border"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          {showUserFilter && (
            <div className="w3-col m3">
              <label>ユーザーID:</label>
              <input
                type="text"
                className="w3-input w3-border"
                placeholder="ユーザーIDで検索"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </div>
          )}
          <div className="w3-col m3">
            <label>表示件数:</label>
            <select
              className="w3-select w3-border"
              value={filters.limit || 20}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
          </div>
        </div>
        <div className="w3-margin-top">
          <button
            className="w3-button w3-blue"
            onClick={onApplyFilters}
          >
            <FaSearch className="w3-margin-right" />
            フィルター適用
          </button>
          <button
            className="w3-button w3-gray w3-margin-left"
            onClick={() => onFilterChange({
              startDate: '',
              endDate: '',
              userId: '',
              page: 1,
              limit: 20
            })}
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceFilters;
