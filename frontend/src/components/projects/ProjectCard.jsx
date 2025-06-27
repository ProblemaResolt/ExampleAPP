import React from 'react';
import { FaUsers, FaCalendarAlt, FaPercent, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import ActionButtons from '../common/ActionButtons';
import StatusBadge from '../common/StatusBadge';

/**
 * プロジェクトカードコンポーネント
 */
const ProjectCard = ({ 
  project, 
  onView, 
  onEdit, 
  onDelete,
  showActions = true 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'COMPLETED':
        return 'blue';
      case 'PAUSED':
        return 'orange';
      case 'CANCELLED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '進行中';
      case 'COMPLETED':
        return '完了';
      case 'PAUSED':
        return '一時停止';
      case 'CANCELLED':
        return '中止';
      default:
        return status;
    }
  };

  const actions = [
    {
      type: 'view',
      label: '詳細',
      onClick: () => onView(project),
      title: '詳細表示'
    },
    {
      type: 'edit',
      label: '編集',
      onClick: () => onEdit(project),
      title: '編集'
    },
    {
      type: 'delete',
      label: '削除',
      onClick: () => onDelete(project),
      title: '削除'
    }
  ];

  return (
    <div className="w3-card w3-margin-bottom">
      <header className="w3-container w3-deep-purple">
        <div className="w3-row">
          <div className="w3-col" style={{ width: showActions ? 'calc(100% - 200px)' : '100%' }}>
            <h4 className="w3-margin-top w3-margin-bottom">{project.name}</h4>
          </div>
          {showActions && (
            <div className="w3-col w3-right-align" style={{ width: '200px' }}>
              <div className="w3-margin-top">
                <ActionButtons 
                  actions={actions} 
                  size="small"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="w3-container w3-padding">
        <div className="w3-row-padding w3-margin-bottom">
          <div className="w3-col m12">
            <StatusBadge 
              status={getStatusLabel(project.status)} 
              color={getStatusColor(project.status)} 
            />
          </div>
        </div>

        {project.description && (
          <div className="w3-row-padding w3-margin-bottom">
            <div className="w3-col m12">
              <p className="w3-text-gray">{project.description}</p>
            </div>
          </div>
        )}

        <div className="w3-row-padding">
          <div className="w3-col m4">
            <div className="w3-small w3-text-gray">
              <FaCalendarAlt className="w3-margin-right" />
              開始日: {formatDate(project.startDate)}
            </div>
          </div>
          
          <div className="w3-col m4">
            <div className="w3-small w3-text-gray">
              <FaCalendarAlt className="w3-margin-right" />
              終了日: {formatDate(project.endDate)}
            </div>
          </div>
          
          <div className="w3-col m4">
            <div className="w3-small w3-text-gray">
              <FaUsers className="w3-margin-right" />
              メンバー: {project.projectMemberships?.length || 0}人
            </div>
          </div>
        </div>

        {project.projectMemberships && project.projectMemberships.length > 0 && (
          <div className="w3-row-padding w3-margin-top">
            <div className="w3-col m12">
              <div className="w3-small w3-text-gray w3-margin-bottom">チームメンバー:</div>
              <div>
                {project.projectMemberships.slice(0, 3).map((membership) => (
                  <span 
                    key={membership.id} 
                    className={`w3-tag w3-small w3-margin-right w3-margin-bottom ${
                      membership.isManager ? 'w3-red' : 'w3-blue'
                    }`}
                  >
                    {membership.user.lastName} {membership.user.firstName}
                    {membership.isManager && ' (M)'}
                    {membership.allocation && (
                      <span className="w3-margin-left">
                        <FaPercent className="w3-tiny" />
                        {membership.allocation}
                      </span>
                    )}
                  </span>
                ))}
                {project.projectMemberships.length > 3 && (
                  <span className="w3-text-gray w3-small">
                    +{project.projectMemberships.length - 3}人
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
