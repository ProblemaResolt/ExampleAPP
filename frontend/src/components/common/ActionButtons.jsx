import React from 'react';
import { FaEdit, FaEye, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * 汎用アクションボタンコンポーネント
 */
const ActionButtons = ({ 
  actions,
  size = 'small',
  orientation = 'horizontal' // horizontal | vertical
}) => {
  const sizeClasses = {
    small: 'w3-small',
    medium: '',
    large: 'w3-large'
  };

  const containerClass = orientation === 'vertical' 
    ? 'w3-bar-block' 
    : 'w3-bar';

  const buttonSpacing = orientation === 'vertical' 
    ? 'w3-margin-bottom' 
    : 'w3-margin-right';

  const getButtonClass = (action) => {
    const baseClass = `w3-button ${sizeClasses[size]} ${buttonSpacing}`;
    
    switch (action.type) {
      case 'view':
        return `${baseClass} w3-blue w3-hover-light-blue`;
      case 'edit':
        return `${baseClass} w3-orange w3-hover-light-orange`;
      case 'delete':
        return `${baseClass} w3-red w3-hover-light-red`;
      case 'approve':
        return `${baseClass} w3-green w3-hover-light-green`;
      case 'reject':
        return `${baseClass} w3-red w3-hover-light-red`;
      case 'primary':
        return `${baseClass} w3-blue w3-hover-light-blue`;
      case 'secondary':
        return `${baseClass} w3-gray w3-hover-light-gray`;
      default:
        return `${baseClass} w3-light-gray w3-hover-gray`;
    }
  };

  const getIcon = (action) => {
    switch (action.type) {
      case 'view':
        return <FaEye />;
      case 'edit':
        return <FaEdit />;
      case 'delete':
        return <FaTrash />;
      case 'approve':
        return <FaCheck />;
      case 'reject':
        return <FaTimes />;
      default:
        return action.icon;
    }
  };

  return (
    <div className={containerClass}>
      {actions.map((action, index) => (
        <button
          key={index}
          className={getButtonClass(action)}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.title || action.label}
        >
          {action.showIcon !== false && getIcon(action)}
          {action.showLabel !== false && action.label && (
            <span className={action.showIcon !== false ? 'w3-margin-left' : ''}>
              {action.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;
