import React from 'react';
import Modal from '../common/Modal';
import EmployeeInfo from '../common/EmployeeInfo';
import { FaPhone, FaMapMarkerAlt, FaBuilding, FaCalendarAlt } from 'react-icons/fa';

/**
 * 従業員詳細モーダルコンポーネント
 */
const EmployeeDetailModal = ({ 
  isOpen, 
  onClose, 
  employee 
}) => {
  if (!employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="従業員詳細"
      size="large"
    >
      <div className="w3-row-padding">
        {/* 基本情報 */}
        <div className="w3-col m6">
          <div className="w3-card w3-margin-bottom">
            <header className="w3-container w3-blue">
              <h4>基本情報</h4>
            </header>
            <div className="w3-container w3-padding">
              <EmployeeInfo
                employee={employee}
                showEmail={true}
                showPosition={true}
                showRole={true}
                showSkills={false}
              />
              
              {/* 追加の基本情報 */}
              {employee.phone && (
                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col">
                    <FaPhone className="w3-margin-right" />
                    <span className="w3-small">{employee.phone}</span>
                  </div>
                </div>
              )}
              
              {employee.address && (
                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col">
                    <FaMapMarkerAlt className="w3-margin-right" />
                    <span className="w3-small">{employee.address}</span>
                  </div>
                </div>
              )}
              
              {employee.company && (
                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col">
                    <FaBuilding className="w3-margin-right" />
                    <span className="w3-small">{employee.company.name}</span>
                  </div>
                </div>
              )}
              
              <div className="w3-row w3-margin-bottom">
                <div className="w3-col">
                  <FaCalendarAlt className="w3-margin-right" />
                  <span className="w3-small">
                    入社日: {formatDate(employee.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* スキル情報 */}
        <div className="w3-col m6">
          <div className="w3-card w3-margin-bottom">
            <header className="w3-container w3-green">
              <h4>スキル情報</h4>
            </header>
            <div className="w3-container w3-padding">
              {employee.userSkills && employee.userSkills.length > 0 ? (
                <div className="w3-row">
                  {employee.userSkills.map((userSkill, index) => {
                    const skillName = userSkill.companySelectedSkill?.skillName || 
                                    userSkill.companySelectedSkill?.globalSkill?.name || 
                                    '不明なスキル';
                    return (
                      <div key={userSkill.id} className="w3-col s12 w3-margin-bottom">
                        <div className="w3-border w3-padding w3-round">
                          <div className="w3-row">
                            <div className="w3-col s8">
                              <strong>{skillName}</strong>
                            </div>
                            <div className="w3-col s4 w3-right-align">
                              <span className="w3-tag w3-blue">
                                {userSkill.years || 0}年
                              </span>
                            </div>
                          </div>
                          {userSkill.companySelectedSkill?.description && (
                            <div className="w3-margin-top w3-small w3-text-gray">
                              {userSkill.companySelectedSkill.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="w3-text-gray">登録されているスキルはありません。</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* プロジェクト情報 */}
      {employee.projectMemberships && employee.projectMemberships.length > 0 && (
        <div className="w3-card w3-margin-bottom">
          <header className="w3-container w3-orange">
            <h4>参加プロジェクト</h4>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-responsive">
              <table className="w3-table-all">
                <thead>
                  <tr>
                    <th>プロジェクト名</th>
                    <th>役割</th>
                    <th>アロケーション</th>
                    <th>期間</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.projectMemberships.map((membership) => (
                    <tr key={membership.id}>
                      <td>{membership.project?.name || '-'}</td>
                      <td>
                        {membership.isManager ? (
                          <span className="w3-tag w3-red">マネージャー</span>
                        ) : (
                          <span className="w3-tag w3-blue">メンバー</span>
                        )}
                      </td>
                      <td>{membership.allocation || 0}%</td>
                      <td>
                        {formatDate(membership.startDate)} ～ {formatDate(membership.endDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EmployeeDetailModal;
