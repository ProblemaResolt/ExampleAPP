import React from 'react';
import { FaEdit, FaTrash, FaUsers, FaEye, FaCalendarAlt, FaBuilding, FaUserPlus } from 'react-icons/fa';

const ProjectRow = ({ 
  project, 
  onView, 
  onEdit, 
  onDelete,
  onMemberManage,
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
                   project.managers?.some(m => m.id === currentUser.id));

  const canDelete = currentUser?.role === 'ADMIN' || 
                    currentUser?.role === 'COMPANY' || 
                    (currentUser?.role === 'MANAGER' && 
                     project.managers?.some(m => m.id === currentUser.id));

  const totalMembers = (project.managers?.length || 0) + (project.members?.length || 0);

  return (
    <tr className="w3-hover-light-grey">
      <td>
        <div>
          <strong className="w3-text-blue">{project.name}</strong>
          {project.description && (
            <div className="w3-small w3-text-grey w3-margin-top">
              {project.description.length > 50 
                ? `${project.description.substring(0, 50)}...` 
                : project.description}
            </div>
          )}
          <div className="w3-small w3-text-grey w3-margin-top">
            <FaBuilding className="w3-margin-right" />
            {project.company?.name || '会社未設定'}
          </div>
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
      </td>
      <td>
        <div className="w3-small w3-margin-bottom">
          <FaUsers className="w3-margin-right" />
          {totalMembers}名のメンバー
        </div>        <div className="w3-bar">
          {/* メンバー表示ボタン */}
          <button
            className="w3-button w3-small w3-blue w3-margin-right"
            onClick={() => onView(project)}
            title="メンバーを表示"
          >
            <FaEye className="w3-margin-right" />
            メンバー
          </button>

          {/* メンバー管理ボタン - MEMBER ロール以外に表示 */}
          {currentUser?.role !== 'MEMBER' && onMemberManage && (
            <button
              className="w3-button w3-small w3-teal w3-margin-right"
              onClick={() => onMemberManage(project)}
              title="メンバーを管理"
            >
              <FaUserPlus />
            </button>
          )}

          {/* 編集ボタン */}
          {canEdit && (
            <button
              className="w3-button w3-small w3-green w3-margin-right"
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
                if (window.confirm(`プロジェクト「${project.name}」を削除しますか？この操作は取り消せません。`)) {
                  onDelete(project.id);
                }
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
