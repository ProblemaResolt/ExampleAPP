import React from 'react';

/**
 * ドロップダウンフィルターコンポーネント
 */
const SelectFilter = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "選択してください",
  className = "",
  label = null
}) => {
  return (
    <div className={`w3-bar-item ${className}`}>
      {label && (
        <label className="w3-text-dark-gray w3-small">
          {label}
        </label>
      )}
      <select
        className="w3-select w3-border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectFilter;
