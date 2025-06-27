import React from 'react';

/**
 * 統計カードコンポーネント
 * 美しいグラデーション背景と統計データを表示する再利用可能なカード
 */
const StatsCard = ({ 
  icon, 
  title, 
  value, 
  color = 'blue', 
  size = 'medium',
  className = '',
  onClick = null,
  isLoading = false,
  subtitle = null
}) => {
  const sizeClasses = {
    small: 'w3-padding-12',
    medium: 'w3-padding-16', 
    large: 'w3-padding-24'
  };

  const iconSizes = {
    small: 'w3-large',
    medium: 'w3-xlarge',
    large: 'w3-jumbo'
  };

  const gradients = {
    blue: 'linear-gradient(135deg, #2196F3, #1976D2)',
    green: 'linear-gradient(135deg, #4CAF50, #45a049)',
    orange: 'linear-gradient(135deg, #FF9800, #F57C00)',
    purple: 'linear-gradient(135deg, #9C27B0, #7B1FA2)',
    red: 'linear-gradient(135deg, #f44336, #d32f2f)',
    teal: 'linear-gradient(135deg, #009688, #00796B)',
    indigo: 'linear-gradient(135deg, #3F51B5, #303F9F)'
  };

  const cardClass = `
    w3-card-4 w3-hover-shadow w3-round-large w3-text-white w3-center stats-card
    ${onClick ? 'w3-hover-opacity w3-button' : ''}
    ${className}
  `.trim();

  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick();
    }
  };

  return (
    <div 
      className={cardClass}
      style={{ background: gradients[color] || gradients.blue }}
      onClick={handleClick}
    >
      <div className={`w3-container ${sizeClasses[size]}`}>
        {isLoading ? (
          <div className="w3-center">
            <div className="w3-spin w3-margin">⟳</div>
            <h4 className="w3-margin-bottom">読み込み中...</h4>
          </div>
        ) : (
          <>
            <div className={`${iconSizes[size]} w3-margin-bottom`} style={{ opacity: 0.8 }}>
              {icon}
            </div>
            <h4 className="w3-margin-bottom">{title}</h4>
            <h2 className="w3-margin-0">{value}</h2>
            {subtitle && (
              <p className="w3-margin-top w3-opacity" style={{ fontSize: '0.9em' }}>
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
