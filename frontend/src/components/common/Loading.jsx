import React from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * ローディングコンポーネント
 * @param {string} message - 表示メッセージ
 * @param {string} size - サイズ (small, medium, large)
 * @param {boolean} overlay - オーバーレイ表示するか
 */
const Loading = ({ 
  message = '読み込み中...', 
  size = 'medium',
  overlay = false 
}) => {
  const sizeClasses = {
    small: 'w3-large',
    medium: 'w3-xxlarge',
    large: 'w3-xxxlarge'
  };

  const content = (
    <div className="w3-center w3-padding">
      <FaSpinner className={`fa-spin ${sizeClasses[size]} w3-text-blue`} />
      {message && <p className="w3-margin-top">{message}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="w3-modal" style={{ display: 'block' }}>
        <div className="w3-modal-content w3-animate-opacity" style={{ 
          width: 'auto',
          maxWidth: '300px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default Loading;
