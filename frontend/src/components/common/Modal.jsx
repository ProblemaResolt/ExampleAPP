import React from 'react';
import { FaTimes } from 'react-icons/fa';

/**
 * 汎用モーダルコンポーネント
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  showCloseButton = true,
  footer = null,
  className = ""
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'w3-modal-content w3-card-4',
    medium: 'w3-modal-content w3-card-4 w3-animate-top',
    large: 'w3-modal-content w3-card-4 w3-animate-top',
    fullscreen: 'w3-modal-content w3-card-4 w3-animate-top'
  };

  const widthStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '600px' },
    large: { maxWidth: '800px' },
    fullscreen: { width: '95%', maxWidth: '1200px' }
  };

  return (
    <div className="w3-modal" style={{ display: 'block' }} onClick={onClose}>
      <div 
        className={`${sizeClasses[size]} ${className}`}
        style={widthStyles[size]}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        {(title || showCloseButton) && (
          <header className="w3-container w3-deep-purple">
            <div className="w3-row">
              <div className="w3-col" style={{ width: showCloseButton ? 'calc(100% - 40px)' : '100%' }}>
                <h4 className="w3-margin-top w3-margin-bottom">{title}</h4>
              </div>
              {showCloseButton && (
                <div className="w3-col" style={{ width: '40px' }}>
                  <button
                    className="w3-button w3-xlarge w3-hover-red w3-display-topright"
                    onClick={onClose}
                    title="閉じる"
                  >
                    <FaTimes />
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        {/* コンテンツ */}
        <div className="w3-container w3-padding">
          {children}
        </div>

        {/* フッター */}
        {footer && (
          <footer className="w3-container w3-border-top w3-padding">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
