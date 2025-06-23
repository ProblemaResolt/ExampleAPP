import React from 'react';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaClock } from 'react-icons/fa';

/**
 * ステータスバッジコンポーネント
 * @param {string} status - ステータス値
 * @param {object} customConfig - カスタム設定（オプション）
 */
const StatusBadge = ({ status, customConfig = {} }) => {
  const defaultConfig = {
    APPROVED: { 
      color: 'green', 
      icon: FaCheckCircle, 
      label: '承認済み' 
    },
    REJECTED: { 
      color: 'red', 
      icon: FaTimesCircle, 
      label: '却下' 
    },
    PENDING: { 
      color: 'orange', 
      icon: FaHourglassHalf, 
      label: '承認待ち' 
    },
    ACTIVE: { 
      color: 'green', 
      icon: FaCheckCircle, 
      label: 'アクティブ' 
    },
    INACTIVE: { 
      color: 'gray', 
      icon: FaClock, 
      label: '非アクティブ' 
    },
    COMPLETED: { 
      color: 'blue', 
      icon: FaCheckCircle, 
      label: '完了' 
    }
  };

  const config = { ...defaultConfig, ...customConfig };
  const statusConfig = config[status] || { 
    color: 'gray', 
    icon: FaClock, 
    label: status || '不明' 
  };

  const IconComponent = statusConfig.icon;

  return (
    <span className={`w3-tag w3-${statusConfig.color}`}>
      <IconComponent className="w3-margin-right" style={{ fontSize: '0.8em' }} />
      {statusConfig.label}
    </span>
  );
};

export default StatusBadge;
