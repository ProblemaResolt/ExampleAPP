import React from 'react';
import SearchBox from '../common/SearchBox';
import SelectFilter from '../common/SelectFilter';

/**
 * プロジェクトフィルターコンポーネント
 */
const ProjectFilters = ({ 
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  managerFilter,
  onManagerFilterChange,
  managers = [],
  showManagerFilter = false
}) => {
  const statusOptions = [
    { value: 'ACTIVE', label: '進行中' },
    { value: 'COMPLETED', label: '完了' },
    { value: 'PAUSED', label: '一時停止' },
    { value: 'CANCELLED', label: '中止' }
  ];

  const managerOptions = managers.map(manager => ({
    value: manager.id,
    label: `${manager.lastName} ${manager.firstName}`
  }));

  return (
    <div className="w3-card w3-margin-bottom">
      <div className="w3-container w3-padding">
        <h4>フィルター</h4>
        <div className="w3-row-padding">
          <div className="w3-col m4">
            <SearchBox
              value={searchTerm}
              onChange={onSearchChange}
              onClear={() => onSearchChange('')}
              placeholder="プロジェクト名で検索"
            />
          </div>
          
          <div className="w3-col m3">
            <SelectFilter
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={statusOptions}
              placeholder="ステータス"
              label="ステータス"
            />
          </div>
          
          {showManagerFilter && (
            <div className="w3-col m3">
              <SelectFilter
                value={managerFilter}
                onChange={onManagerFilterChange}
                options={managerOptions}
                placeholder="マネージャー"
                label="マネージャー"
              />
            </div>
          )}
          
          <div className="w3-col m2">
            <label className="w3-text-dark-gray w3-small">&nbsp;</label>
            <button
              className="w3-button w3-gray w3-block"
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('');
                if (showManagerFilter) onManagerFilterChange('');
              }}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectFilters;
