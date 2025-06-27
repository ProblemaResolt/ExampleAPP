import React from 'react';

/**
 * 汎用カードコンポーネント
 */
const Card = ({ 
  title,
  subtitle,
  children,
  actions,
  className = "",
  headerColor = "w3-deep-purple",
  padding = true,
  shadow = true
}) => {
  const cardClass = `w3-card${shadow ? '-4' : ''} w3-margin-bottom ${className}`;

  return (
    <div className={cardClass}>
      {/* ヘッダー */}
      {title && (
        <header className={`w3-container ${headerColor} ${padding ? 'w3-padding' : ''}`}>
          <div className="w3-row">
            <div className="w3-col" style={{ width: actions ? 'calc(100% - 120px)' : '100%' }}>
              <h3 className="w3-margin-top w3-margin-bottom">{title}</h3>
              {subtitle && (
                <p className="w3-margin-bottom w3-opacity">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="w3-col w3-right-align" style={{ width: '120px' }}>
                <div className="w3-margin-top">
                  {actions}
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* コンテンツ */}
      <div className={`w3-container ${padding ? 'w3-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
