import React from 'react';
import SearchBox from '../common/SearchBox';
import SelectFilter from '../common/SelectFilter';

/**
 * 従業員フィルターコンポーネント
 */
const EmployeeFilters = ({ 
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  companyFilter,
  onCompanyFilterChange,
  companies = [],
  showCompanyFilter = false
}) => {
  const roleOptions = [
    { value: 'MANAGER', label: 'マネージャー' },
    { value: 'MEMBER', label: 'メンバー' },
    { value: 'COMPANY', label: '管理者' }
  ];

  const statusOptions = [
    { value: 'active', label: '有効' },
    { value: 'inactive', label: '無効' }
  ];

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: company.name
  }));

  return (
    <div className="w3-card w3-margin-bottom">
      <div className="w3-container w3-padding">
        <h4>フィルター</h4>
        <div className="w3-row-padding">
          <div className="w3-col m3">
            <SearchBox
              value={searchTerm}
              onChange={onSearchChange}
              onClear={() => onSearchChange('')}
              placeholder="名前・メールで検索"
            />
          </div>
          
          <div className="w3-col m2">
            <SelectFilter
              value={roleFilter}
              onChange={onRoleFilterChange}
              options={roleOptions}
              placeholder="ロール"
              label="ロール"
            />
          </div>
          
          <div className="w3-col m2">
            <SelectFilter
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={statusOptions}
              placeholder="ステータス"
              label="ステータス"
            />
          </div>
          
          {showCompanyFilter && (
            <div className="w3-col m3">
              <SelectFilter
                value={companyFilter}
                onChange={onCompanyFilterChange}
                options={companyOptions}
                placeholder="会社"
                label="会社"
              />
            </div>
          )}
          
          <div className="w3-col m2">
            <label className="w3-text-dark-gray w3-small">&nbsp;</label>
            <button
              className="w3-button w3-gray w3-block"
              onClick={() => {
                onSearchChange('');
                onRoleFilterChange('');
                onStatusFilterChange('');
                if (showCompanyFilter) onCompanyFilterChange('');
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

export default EmployeeFilters;
