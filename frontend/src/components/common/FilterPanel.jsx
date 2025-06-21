import React from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import Card from './Card';

/**
 * 汎用フィルターパネルコンポーネント
 */
const FilterPanel = ({ 
  title = "フィルター",
  children,
  isCollapsed = false,
  onToggle,
  onClear,
  className = ""
}) => {
  return (
    <Card 
      title={title}
      actions={
        <div className="w3-bar">
          {onClear && (
            <button
              className="w3-button w3-small w3-gray w3-margin-right"
              onClick={onClear}
              title="フィルターをクリア"
            >
              <FaTimes />
            </button>
          )}
          {onToggle && (
            <button
              className="w3-button w3-small w3-blue"
              onClick={onToggle}
              title={isCollapsed ? "フィルターを表示" : "フィルターを非表示"}
            >
              <FaFilter />
            </button>
          )}
        </div>
      }
      className={className}
    >
      {!isCollapsed && children}
    </Card>
  );
};

export default FilterPanel;
