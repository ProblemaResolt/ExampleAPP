import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPercentage, FaUsers, FaUserTie, FaClock } from 'react-icons/fa';

const ProjectMembersModal = ({ 
  open, 
  onClose, 
  project, 
  onMemberEdit,
  onPeriodEdit,
  onAllocationEdit,
  onRemoveMember,
  onAddMember,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState('managers');

  if (!open || !project) return null;

  const managers = project.members?.filter(m => m.isManager) || [];
  const members = project.members?.filter(m => !m.isManager) || [];  const canEdit = currentUser?.role === 'ADMIN' || 
                  currentUser?.role === 'COMPANY' || 
                  (currentUser?.role === 'MANAGER' && 
                   managers.some(m => m.user.id === currentUser.id));

  const canEditMembers = canEdit;

  // プロジェクトが完了状態で終了日を過ぎているかチェック
  const isCompletedAndPastEndDate = project.status === 'COMPLETED' && 
    project.endDate && 
    new Date() > new Date(project.endDate);

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatAllocation = (allocation) => {
    return `${Math.round((allocation || 0) * 100)}%`;
  };

  const getStatusColor = (totalAllocation) => {
    if (totalAllocation >= 1.0) return 'w3-red';
    if (totalAllocation >= 0.8) return 'w3-orange';
    return 'w3-green';
  };

  const MemberTable = ({ members, title, icon }) => (
    <div className="w3-margin-bottom">
      <h4 className="w3-text-blue">
        {icon} {title} ({members.length}名)
      </h4>
      
      {members.length === 0 ? (
        <div className="w3-panel w3-light-grey w3-center">
          <p>{title}が登録されていません</p>
        </div>
      ) : (
        <div className="w3-responsive">
          <table className="w3-table w3-bordered w3-striped w3-small">            <thead>              <tr className="">
                <th>名前</th>
                <th>役職</th>                <th>期間</th>
                <th>工数</th>
                <th>総工数</th>
                <th>勤務時間</th>
                <th>勤務設定</th>
                <th>編集</th>
              </tr>
            </thead>
            <tbody>
              {members.map(membership => {
                const member = membership.user;
                return (
                <tr key={member.id}>
                  <td>
                    <strong>{member.lastName} {member.firstName}</strong>
                    <br />
                    <small className="w3-text-grey">{member.email}</small>
                  </td>
                  <td>{member.position || '未設定'}</td>
                  <td>
                    <div className="w3-small">
                      <div>開始: {formatDate(membership.startDate)}</div>
                      <div>終了: {formatDate(membership.endDate)}</div>
                    </div>
                  </td>
                  <td>
                    <span className="w3-tag w3-blue w3-round">
                      {formatAllocation(membership.allocation)}
                    </span>
                  </td>                  <td>
                    <span className={`w3-tag w3-round ${getStatusColor(member.totalAllocation)}`}>
                      {formatAllocation(member.totalAllocation)}
                    </span>                  </td>                  <td>
                    {member.workSettingsAssignment ? (
                      <div className="w3-small">
                        <div className="w3-text-blue">
                          <strong>{member.workSettingsAssignment.workStartTime}-{member.workSettingsAssignment.workEndTime}</strong>
                        </div>
                        <div className="w3-text-grey">
                          休憩: {member.workSettingsAssignment.breakTime}分
                        </div>
                        <div className="w3-text-grey">
                          標準: {member.workSettingsAssignment.workHours}h
                        </div>
                      </div>
                    ) : (
                      <span className="w3-tag w3-grey w3-small w3-round">
                        勤務時間未設定
                      </span>
                    )}
                  </td>
                  <td>
                    {member.workSettingsAssignment ? (
                      <div className="w3-small">                        <span className="w3-tag w3-green w3-small w3-round w3-margin-bottom" title={member.workSettingsAssignment.projectWorkSettingName}>
                          設定済み
                        </span>
                        <div className="w3-text-grey">
                          設定名: {member.workSettingsAssignment.projectWorkSettingName}
                        </div>
                      </div>
                    ) : (
                      <span className="w3-tag w3-grey w3-small w3-round">
                        未設定
                      </span>
                    )}
                  </td>{canEditMembers && (
                    <td>
                      <div className="w3-bar">
                        <button
                          className="w3-button w3-small w3-blue w3-margin-right"
                          onClick={() => onPeriodEdit(member, project)}
                          title="期間編集"
                        >
                          <FaClock />
                        </button>
                        <button
                          className="w3-button w3-small w3-green w3-margin-right"
                          onClick={() => onAllocationEdit(member, project)}
                          title="工数編集"
                        >
                          <FaPercentage />
                        </button>
                        <button
                          className="w3-button w3-small w3-red"
                          onClick={() => {
                            onRemoveMember({ projectId: project.id, memberId: member.id });
                          }}
                          title="削除"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  )} 
                  {!canEditMembers && (
                    <td>
                      <span className="w3-text-grey w3-small">
                        編集権限なし
                      </span>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="w3-modal" style={{ display: 'block', zIndex: 1000 }}>
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red w3-large"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>
            <FaUsers className="w3-margin-right" />
            {project.name} - メンバー管理
          </h3>
        </header>

        <div className="w3-container w3-padding" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>          {/* プロジェクト基本情報 */}
          <div className="w3-panel w3-green w3-leftbar w3-border-blue">
            <div className="w3-row-padding">
              <div className="w3-col m2">
                <strong>開始日:</strong> {formatDate(project.startDate)}
              </div>
              <div className="w3-col m2">
                <strong>終了日:</strong> {formatDate(project.endDate)}
              </div>
              <div className="w3-col m2">
                <strong>ステータス:</strong> 
                <span className={`w3-tag w3-margin-left ${
                  project.status === 'ACTIVE' ? 'w3-green' : 
                  project.status === 'COMPLETED' ? 'w3-blue' : 
                  project.status === 'ON_HOLD' ? 'w3-orange' : 'w3-red'
                }`}>
                  {project.status}
                </span>
              </div>
              <div className="w3-col m2">
                <strong>管理会社:</strong> {project.company?.name}
              </div>
              {project.clientCompanyName && (
                <div className="w3-col m2">
                  <strong>クライアント:</strong> {project.clientCompanyName}
                </div>
              )}
              <div className="w3-col m2">
                <div className="w3-row-padding">
                  <div className="w3-col s4">
                    <div className="w3-center">
                      <strong className="w3-text-blue">{managers.length}</strong>
                      <div className="w3-tiny">マネージャー</div>
                    </div>
                  </div>
                  <div className="w3-col s4">
                    <div className="w3-center">
                      <strong className="w3-text-green">{members.length}</strong>
                      <div className="w3-tiny">メンバー</div>
                    </div>
                  </div>
                  <div className="w3-col s4">
                    <div className="w3-center">
                      <strong className="w3-text-orange">{managers.length + members.length}</strong>
                      <div className="w3-tiny">総計</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 完了プロジェクトの警告メッセージ */}
          {isCompletedAndPastEndDate && (
            <div className="w3-panel w3-pale-red w3-leftbar w3-border-red w3-margin-bottom">
              <h4>⚠️ 完了プロジェクト</h4>
              <p>このプロジェクトは完了しており、終了日を過ぎています。</p>
              <p>新しいメンバーの追加はできず、既存のメンバー（マネージャー以外）は自動的に除外されます。</p>
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="w3-bar w3-border-bottom w3-margin-bottom">
            <button
              className={`w3-bar-item w3-button ${activeTab === 'managers' ? 'w3-blue' : 'w3-light-grey'}`}
              onClick={() => setActiveTab('managers')}
            >
              <FaUserTie className="w3-margin-right" />
              マネージャー ({managers.length})
            </button>
            <button
              className={`w3-bar-item w3-button ${activeTab === 'members' ? 'w3-blue' : 'w3-light-grey'}`}
              onClick={() => setActiveTab('members')}
            >
              <FaUsers className="w3-margin-right" />
              メンバー ({members.length})
            </button>
          </div>          {/* タブコンテンツ */}
          {activeTab === 'managers' && (
            <MemberTable 
              members={managers} 
              title="マネージャー" 
              icon={<FaUserTie />}
            />
          )}

          {activeTab === 'members' && (
            <MemberTable 
              members={members} 
              title="メンバー" 
              icon={<FaUsers />}
            />
          )}        </div>

        <footer className="w3-container w3-padding">
          <button 
            className="w3-button w3-grey w3-right"
            onClick={onClose}
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectMembersModal;
