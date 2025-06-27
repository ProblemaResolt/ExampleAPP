import React from 'react';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = '確認', 
  cancelText = 'キャンセル',
  type = 'info', // 'info', 'warning', 'danger', 'success'
  isLoading = false
}) => {
  if (!isOpen) return null;
  const getTypeConfig = (type) => {
    const configs = {
      info: {
        bgColor: 'w3-blue',
        textColor: 'w3-text-white',
        icon: <FaInfoCircle className="w3-margin-right" />,
        confirmBtnClass: 'w3-blue w3-hover-indigo',
        shadowColor: 'rgba(33, 150, 243, 0.2)',
        bgColorCode: '#2196f3'
      },
      warning: {
        bgColor: 'w3-orange',
        textColor: 'w3-text-white', 
        icon: <FaExclamationTriangle className="w3-margin-right" />,
        confirmBtnClass: 'w3-orange w3-hover-deep-orange',
        shadowColor: 'rgba(255, 152, 0, 0.2)',
        bgColorCode: '#ff9800'
      },
      danger: {
        bgColor: 'w3-red',
        textColor: 'w3-text-white',
        icon: <FaTimes className="w3-margin-right" />,
        confirmBtnClass: 'w3-red w3-hover-deep-orange',
        shadowColor: 'rgba(244, 67, 54, 0.2)',
        bgColorCode: '#f44336'
      },
      success: {
        bgColor: 'w3-green',
        textColor: 'w3-text-white',
        icon: <FaCheck className="w3-margin-right" />,
        confirmBtnClass: 'w3-green w3-hover-light-green',
        shadowColor: 'rgba(76, 175, 80, 0.2)',
        bgColorCode: '#4caf50'
      }
    };
    return configs[type] || configs.info;
  };

  const config = getTypeConfig(type);

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
      onClose();
    }
  };

  return (    <div className="w3-modal" style={{ 
      display: 'block', 
      zIndex: 1000,
      background: 'rgba(0,0,0,0.3)'
    }}>
      <div 
        className="w3-modal-content w3-animate-top w3-card-4" 
        style={{ 
          maxWidth: '420px', 
          margin: '15% auto',
          borderRadius: '8px',
          boxShadow: `0 4px 20px ${config.shadowColor}`,
          border: 'none',
          overflow: 'hidden'
        }}
      >
        {/* ヘッダー */}
        <header style={{
          background: config.bgColorCode,
          color: 'white',
          padding: '16px 20px',
          position: 'relative'
        }}>
          <span 
            className="w3-button w3-hover-red"
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &times;
          </span>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            margin: '0',
            display: 'flex',
            alignItems: 'center'
          }}>
            {config.icon}
            {title}
          </h4>
        </header>
          {/* コンテンツ */}
        <div style={{ padding: '20px' }}>
          <p style={{ 
            fontSize: '14px', 
            lineHeight: '1.5',
            margin: '0',
            color: '#333'
          }}>
            {message}
          </p>
        </div>
        
        {/* フッター（ボタン） */}
        <footer style={{ 
          padding: '16px 20px 20px',
          textAlign: 'right',
          background: '#f8f9fa'
        }}>
          <button 
            className="w3-button w3-hover-gray"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: '#e9ecef',
              color: '#495057',
              border: 'none',
              borderRadius: '4px',
              minWidth: '72px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              marginRight: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              background: config.bgColorCode,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              minWidth: '72px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? (
              <>
                <i className="fa fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                処理中...
              </>
            ) : (
              confirmText
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmDialog;
