import React from 'react';
import { FaCog, FaFileExport, FaCalendarPlus, FaEdit } from 'react-icons/fa';
import ActionButtons from '../common/ActionButtons';

/**
 * 勤怠管理ツールバーコンポーネント
 */
const AttendanceToolbar = ({ 
  onSettingsClick,
  onBulkSettingsClick,
  onExportClick,
  onWorkReportClick,
  onBulkTransportationClick,
  showManagerActions = false,
  userRole = 'MEMBER'
}) => {
  const getActions = () => {
    const actions = [
      {
        type: 'primary',
        label: '設定',
        icon: <FaCog />,
        onClick: onSettingsClick,
        title: '勤務設定'
      },
      {
        type: 'secondary',
        label: 'エクスポート',
        icon: <FaFileExport />,
        onClick: onExportClick,
        title: 'Excelエクスポート'
      }
    ];

    if (showManagerActions) {
      actions.push(
        {
          type: 'primary',
          label: '一括設定',
          icon: <FaEdit />,
          onClick: onBulkSettingsClick,
          title: '一括設定'
        },
        {
          type: 'secondary',
          label: '一括交通費',
          icon: <FaEdit />,
          onClick: onBulkTransportationClick,
          title: '一括交通費設定'
        }
      );
    }

    actions.push({
      type: 'primary',
      label: '作業報告',
      icon: <FaCalendarPlus />,
      onClick: onWorkReportClick,
      title: '作業報告書'
    });

    return actions;
  };

  return (
    <div className="w3-card w3-margin-bottom">
      <div className="w3-container w3-padding">
        <div className="w3-row">
          <div className="w3-col">
            <h4>操作メニュー</h4>
          </div>
        </div>
        <div className="w3-row">
          <div className="w3-col">
            <ActionButtons
              actions={getActions()}
              size="medium"
              orientation="horizontal"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceToolbar;
