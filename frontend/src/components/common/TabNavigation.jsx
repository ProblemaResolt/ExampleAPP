import React from 'react';

/**
 * タブナビゲーションコンポーネント
 */
const TabNavigation = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  className = ""
}) => {
  return (
    <div className={`w3-bar w3-border w3-margin-bottom ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`w3-bar-item w3-button ${
            activeTab === tab.id ? 'w3-blue' : 'w3-light-gray'
          }`}
          onClick={() => onTabChange(tab.id)}
          disabled={tab.disabled}
        >
          {tab.icon && <span className="w3-margin-right">{tab.icon}</span>}
          {tab.label}
          {tab.badge && (
            <span className="w3-badge w3-red w3-margin-left">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
