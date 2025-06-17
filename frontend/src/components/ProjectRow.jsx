import React from 'react';
import { FaEdit, FaTrash, FaUsers, FaEye, FaCalendarAlt, FaBuilding, FaUserPlus, FaInfoCircle } from 'react-icons/fa';

const ProjectRow = ({ 
  project, 
  onView, 
  onEdit, 
  onDelete,
  onMemberManage,
  onDetailView,
  currentUser 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { class: 'w3-green', text: '進行中' },
      COMPLETED: { class: 'w3-blue', text: '完了' },
      ON_HOLD: { class: 'w3-orange', text: '保留' },
      CANCELLED: { class: 'w3-red', text: 'キャンセル' }
    };
    
    const config = statusConfig[status] || { class: 'w3-grey', text: status };
    
    return (
      <span className={`w3-tag w3-round ${config.class}`}>
        {config.text}
      </span>
    );
  };
  const canEdit = currentUser?.role === 'ADMIN' || 
                  currentUser?.role === 'COMPANY' || 
                  (currentUser?.role === 'MANAGER' && 
                   project.members?.some(m => m.isManager && m.user.id === currentUser.id));
  const canDelete = currentUser?.role === 'ADMIN' || 
                    currentUser?.role === 'COMPANY' || 
                    (currentUser?.role === 'MANAGER' && 
                     project.members?.some(m => m.isManager && m.user.id === currentUser.id));

  const totalMembers = project.members?.length || 0;return (
    <tr className="w3-hover-light-grey">
      {/* プロジェクト詳細ボタン - 一番左 */}
      <td>
        <button
          className="w3-button w3-small w3-blue"
          onClick={() => onDetailView(project)}
          title="プロジェクト詳細を表示"
        >
          <FaInfoCircle className="w3-margin-right" />
          詳細
        </button>
      </td>
        {/* メンバー列 */}
      <td>
        <div className="w3-small w3-margin-bottom">
          <FaUsers className="w3-margin-right" />
          {totalMembers}名のメンバー
        </div>        <button
          className="w3-button w3-small w3-blue"
          onClick={() => onView(project)}
          title="メンバーを表示"
        >
          <FaEye className="w3-margin-right" />
          メンバーを表示
        </button>
      </td><td>
        <div>
          <strong className="w3-text-blue">{project.name}</strong>
          {project.clientCompanyName && (
            <div className="w3-small w3-text-blue w3-margin-top">
              <FaBuilding className="w3-margin-right" />
              クライアント: {project.clientCompanyName}
            </div>
          )}
          {project.description && (
            <div className="w3-small w3-text-grey w3-margin-top">
              {project.description.length > 50 
                ? `${project.description.substring(0, 50)}...` 
                : project.description}
            </div>
          )}
        </div>
      </td>
      <td>{getStatusBadge(project.status)}</td>
      <td>
        <div className="w3-small">
          <FaCalendarAlt className="w3-margin-right" />
          {formatDate(project.startDate)}
        </div>
      </td>
      <td>
        <div className="w3-small">
          <FaCalendarAlt className="w3-margin-right" />
          {formatDate(project.endDate)}
        </div>
      </td>      <td>
        <div className="w3-bar">          {/* 編集ボタン */}
          {canEdit && (
            <button
              className="w3-button w3-small w3-margin-right w3-green"
              onClick={() => onEdit(project)}
              title="プロジェクトを編集"
            >
              <FaEdit />
            </button>
          )}

          {/* 削除ボタン */}
          {canDelete && (
            <button
              className="w3-button w3-small w3-red"
              onClick={() => {
                onDelete(project.id);
              }}
              title="プロジェクトを削除"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default ProjectRow;
