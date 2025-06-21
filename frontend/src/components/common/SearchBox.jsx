import React from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

/**
 * 検索ボックスコンポーネント
 */
const SearchBox = ({ 
  value, 
  onChange, 
  onClear,
  placeholder = "検索...",
  className = ""
}) => {
  return (
    <div className={`w3-bar-item ${className}`}>
      <div className="w3-row">
        <div className="w3-col" style={{ width: 'calc(100% - 40px)' }}>
          <input
            type="text"
            className="w3-input w3-border"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div className="w3-col" style={{ width: '40px' }}>
          {value ? (
            <button
              className="w3-button w3-red w3-hover-red"
              onClick={onClear}
              title="クリア"
              style={{ height: '100%' }}
            >
              <FaTimes />
            </button>
          ) : (
            <button
              className="w3-button w3-gray"
              disabled
              style={{ height: '100%' }}
            >
              <FaSearch />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBox;
