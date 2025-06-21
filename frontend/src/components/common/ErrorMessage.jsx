import React from 'react';
import { FaExclamationTriangle, FaSync } from 'react-icons/fa';

/**
 * エラー表示コンポーネント
 * @param {Error|string} error - エラーオブジェクトまたはメッセージ
 * @param {function} onRetry - リトライ関数（オプション）
 * @param {string} title - エラータイトル（オプション）
 */
const ErrorMessage = ({ 
  error, 
  onRetry, 
  title = 'エラーが発生しました' 
}) => {
  const errorMessage = error?.message || error || '不明なエラーが発生しました';

  return (
    <div className="w3-panel w3-red w3-card">
      <div className="w3-row">
        <div className="w3-col" style={{ width: '40px' }}>
          <FaExclamationTriangle className="w3-xxlarge" />
        </div>
        <div className="w3-rest w3-padding-left">
          <h4>{title}</h4>
          <p>{errorMessage}</p>
          {onRetry && (
            <button 
              className="w3-button w3-white w3-border w3-margin-top"
              onClick={onRetry}
            >
              <FaSync className="w3-margin-right" />
              再試行
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
