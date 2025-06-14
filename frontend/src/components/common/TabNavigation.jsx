import React from 'react';

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="w3-bar w3-border-bottom w3-margin-bottom">
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          className={`w3-bar-item w3-button ${activeTab === tab.id ? 'w3-blue' : 'w3-light-gray'}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span className="w3-margin-right">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
