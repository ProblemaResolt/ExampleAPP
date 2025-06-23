import React from 'react';
import { FaUser, FaEnvelope } from 'react-icons/fa';

// ロールの表示名マッピング
const roleLabels = {
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー',
  COMPANY: '管理者'
};

// ロールの色マッピング
const roleColors = {
  MANAGER: 'w3-orange',
  MEMBER: 'w3-blue',
  COMPANY: 'w3-red'
};

/**
 * 従業員情報表示コンポーネント
 */
const EmployeeInfo = ({ 
  employee, 
  showEmail = true, 
  showPosition = true,
  showRole = true,
  showSkills = false,
  maxSkillsDisplay = 3,
  className = ""
}) => {
  return (
    <div className={`w3-container ${className}`}>
      {/* 名前 */}
      <div className="w3-row w3-margin-bottom">
        <div className="w3-col">
          <FaUser className="w3-margin-right" />
          <strong>{employee.lastName} {employee.firstName}</strong>
        </div>
      </div>

      {/* 役職 */}
      {showPosition && employee.position && (
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col w3-small w3-text-gray">
            役職: {employee.position}
          </div>
        </div>
      )}

      {/* ロール */}
      {showRole && (
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col">
            <span className={`w3-tag w3-small ${roleColors[employee.role]}`}>
              {roleLabels[employee.role]}
            </span>
          </div>
        </div>
      )}

      {/* メール */}
      {showEmail && (
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col w3-small">
            <FaEnvelope className="w3-margin-right" />
            {employee.email}
          </div>
        </div>
      )}

      {/* スキル */}
      {showSkills && employee.userSkills && (
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col">
            <div className="w3-small w3-text-gray w3-margin-bottom">スキル:</div>
            <div style={{ maxWidth: '200px', overflow: 'hidden' }}>
              {employee.userSkills.length > 0 ? (
                employee.userSkills.slice(0, maxSkillsDisplay).map((userSkill, index) => {
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
                })
              ) : (
                <span className="w3-text-gray w3-small">-</span>
              )}
              {employee.userSkills.length > maxSkillsDisplay && (
                <span className="w3-text-gray w3-small">
                  +{employee.userSkills.length - maxSkillsDisplay}個
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeInfo;
