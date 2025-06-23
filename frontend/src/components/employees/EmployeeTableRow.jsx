import React from 'react';
import { FaUser, FaEnvelope, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import EmployeeInfo from '../common/EmployeeInfo';
import ActionButtons from '../common/ActionButtons';

/**
 * 従業員テーブル行コンポーネント
 */
const EmployeeTableRow = ({ 
  employee, 
  onEdit, 
  onDelete, 
  onViewDetail,
  showSkills = true 
}) => {
  const actions = [
    {
      type: 'view',
      label: '詳細',
      onClick: () => onViewDetail(employee),
      title: '詳細表示'
    },
    {
      type: 'edit',
      label: '編集',
      onClick: () => onEdit(employee),
      title: '編集'
    },
    {
      type: 'delete',
      label: '削除',
      onClick: () => onDelete(employee),
      title: '削除'
    }
  ];
  return (
    <tr className="w3-hover-light-gray">
      <td>
        <button
          className="w3-button w3-small w3-blue"
          onClick={() => onViewDetail(employee)}
          title="詳細表示"
        >
          <FaEye /> 詳細
        </button>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaUser className="w3-margin-right" />
          {employee.lastName} {employee.firstName}
        </div>
      </td>
      <td>{employee.position || '-'}</td>
      <td>
        <span className={`w3-tag ${getRoleColor(employee.role)}`}>
          {getRoleLabel(employee.role)}
        </span>
      </td>
      <td>
        <div className="w3-cell-row">
          <FaEnvelope className="w3-margin-right" />
          {employee.email}
        </div>
      </td>
      {showSkills && (
        <td>
          <EmployeeSkillTags skills={employee.userSkills} maxDisplay={3} />
        </td>
      )}
      <td>
        <span className={`w3-tag ${employee.isActive ? 'w3-green' : 'w3-red'}`}>
          {employee.isActive ? '有効' : '無効'}
        </span>
      </td>
      <td>
        <div className="w3-bar">
          <button
            className="w3-button w3-small w3-blue w3-margin-right"
            onClick={() => onEdit(employee)}
            title="編集"
          >
            <FaEdit />
          </button>
          <button
            className="w3-button w3-small w3-red"
            onClick={() => onDelete(employee)}
            title="削除"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * 従業員スキルタグ表示コンポーネント
 */
const EmployeeSkillTags = ({ skills, maxDisplay = 3 }) => {
  if (!skills || skills.length === 0) {
    return <span className="w3-text-gray">-</span>;
  }

  return (
    <div style={{ maxWidth: '200px', overflow: 'hidden' }}>
      {skills.slice(0, maxDisplay).map((userSkill, index) => {
        const skillName = userSkill.companySelectedSkill?.skillName || 
                        userSkill.companySelectedSkill?.globalSkill?.name || 
                        '不明なスキル';
        return (
          <span 
            key={userSkill.id} 
            className="w3-tag w3-small w3-green w3-margin-right w3-margin-bottom"
            title={`${skillName}（${userSkill.years || 0}年）`}
          >
            {skillName}（{userSkill.years || 0}年）
          </span>
        );
      })}
      {skills.length > maxDisplay && (
        <span className="w3-text-gray w3-small">
          +{skills.length - maxDisplay}個
        </span>
      )}
    </div>
  );
};

// ユーティリティ関数
const getRoleLabel = (role) => {
  const roleLabels = {
    MANAGER: 'マネージャー',
    MEMBER: 'メンバー',
    COMPANY: '管理者'
  };
  return roleLabels[role] || role;
};

const getRoleColor = (role) => {
  const roleColors = {
    MANAGER: 'w3-orange',
    MEMBER: 'w3-blue',
    COMPANY: 'w3-red'
  };
  return roleColors[role] || 'w3-gray';
};

export default EmployeeTableRow;
export { EmployeeSkillTags };
