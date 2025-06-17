import React, { useState } from 'react';
import { useFormik } from 'formik';
import { FaSpinner, FaPlus, FaUsers } from 'react-icons/fa';
import { projectSchema, statusLabels } from '../utils/validation';
import AddMemberDialog from './AddMemberDialog';

const ProjectEditDialog = ({ 
  open, 
  onClose, 
  project, 
  onSubmit, 
  membersData, 
  isSubmitting = false 
}) => {
  const [showAddManagerDialog, setShowAddManagerDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);  const formik = useFormik({    initialValues: {
      name: project?.name || '',
      description: project?.description || '',
      clientCompanyName: project?.clientCompanyName || '',
      clientContactName: project?.clientContactName || '',
      clientContactPhone: project?.clientContactPhone || '',
      clientContactEmail: project?.clientContactEmail || '',
      clientPrefecture: project?.clientPrefecture || '',
      clientCity: project?.clientCity || '',
      clientStreetAddress: project?.clientStreetAddress || '',
      startDate: project?.startDate ? project.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: project?.endDate ? project.endDate.split('T')[0] : '',
      status: project?.status || 'IN_PROGRESS',
      managerIds: project?.members?.filter(m => m.isManager).map(m => m.user.id) || [],
      memberIds: project?.members?.filter(m => !m.isManager).map(m => m.user.id) || []
    },
    enableReinitialize: true,
    validationSchema: projectSchema,    onSubmit: (values, actions) => {
      const submitValues = { ...values };
      if (!project) {
        // 新規プロジェクト作成時はフラグを追加
        submitValues.isCreating = true;
      } else {
        // 既存プロジェクト編集時もメンバー情報を送信（追加のため）
      }
      
      // 親コンポーネントのonSubmitを呼び出し
      onSubmit(submitValues, actions);
    }
  });

  // 自社案件の場合にマネージャー情報を自動設定する関数
  const handleCompanyNameChange = (e) => {
    const companyName = e.target.value;
    formik.handleChange(e);
    
    if (companyName === '自社' && formik.values.managerIds.length > 0) {
      // 最初のマネージャーの情報を取得
      const firstManagerId = formik.values.managerIds[0];
      const manager = (membersData?.users || []).find(u => u.id === firstManagerId);
      if (manager) {
        formik.setFieldValue('clientContactName', `${manager.lastName} ${manager.firstName}`);
        formik.setFieldValue('clientContactEmail', manager.email);
        formik.setFieldValue('clientContactPhone', manager.phone || '');
        // 会社住所があれば設定
        if (manager.prefecture || manager.city || manager.streetAddress) {
          formik.setFieldValue('clientPrefecture', manager.prefecture || '');
          formik.setFieldValue('clientCity', manager.city || '');
          formik.setFieldValue('clientStreetAddress', manager.streetAddress || '');
        }
      }
    } else if (companyName !== '自社') {
      // 自社以外の場合はクリア
      formik.setFieldValue('clientContactName', '');
      formik.setFieldValue('clientContactEmail', '');
      formik.setFieldValue('clientContactPhone', '');
      formik.setFieldValue('clientPrefecture', '');
      formik.setFieldValue('clientCity', '');
      formik.setFieldValue('clientStreetAddress', '');
    }
  };  // マネージャー選択時の処理
  const handleManagerSelection = (selectedMembers) => {
    const selectedIds = selectedMembers.map(member => member.id);
    formik.setFieldValue('managerIds', selectedIds);

    // 自社案件の場合は担当者情報を更新
    if (formik.values.clientCompanyName === '自社' && selectedMembers.length > 0) {
      const firstManager = selectedMembers[0];
      formik.setFieldValue('clientContactName', `${firstManager.lastName} ${firstManager.firstName}`);
      formik.setFieldValue('clientContactEmail', firstManager.email);
      formik.setFieldValue('clientContactPhone', firstManager.phone || '');
      if (firstManager.prefecture || firstManager.city || firstManager.streetAddress) {
        formik.setFieldValue('clientPrefecture', firstManager.prefecture || '');
        formik.setFieldValue('clientCity', firstManager.city || '');
        formik.setFieldValue('clientStreetAddress', firstManager.streetAddress || '');
      }
    }
    setShowAddManagerDialog(false);
  };
  // メンバー選択時の処理
  const handleMemberSelection = (selectedMembers) => {
    const selectedIds = selectedMembers.map(member => member.id);
    formik.setFieldValue('memberIds', selectedIds);
    setShowAddMemberDialog(false);
  };
  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '90vw', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red w3-large"
            onClick={onClose}
          >
            &times;
          </span>
          <h3>{project ? 'プロジェクトを編集' : 'プロジェクトを追加'}</h3>
        </header>
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col m12">
                <label>プロジェクト名</label>
                <input
                  className="w3-input w3-border"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="w3-text-red">{formik.errors.name}</div>
                )}
              </div>              <div className="w3-col m12">
                <label>説明</label>
                <textarea
                  className="w3-input w3-border"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </div>              <div className="w3-col m12">
                <label>クライアント企業名</label>                <input
                  className="w3-input w3-border"
                  name="clientCompanyName"
                  value={formik.values.clientCompanyName}
                  onChange={handleCompanyNameChange}
                  placeholder="クライアント企業名を入力（自社案件の場合は「自社」と入力）"
                />
                <small className="w3-text-grey">
                  クライアント企業名を入力してください。自社案件の場合は「自社」と入力してください。
                </small>
              </div>

              {/* クライアント企業住所 */}
              <div className="w3-col m12">
                <h4 className="w3-text-blue">クライアント企業住所</h4>
              </div>
              <div className="w3-col m4">
                <label>都道府県</label>
                <input
                  className="w3-input w3-border"
                  name="clientPrefecture"
                  value={formik.values.clientPrefecture}
                  onChange={formik.handleChange}
                  placeholder="東京都"
                />
              </div>
              <div className="w3-col m4">
                <label>市町村</label>
                <input
                  className="w3-input w3-border"
                  name="clientCity"
                  value={formik.values.clientCity}
                  onChange={formik.handleChange}
                  placeholder="渋谷区"
                />
              </div>
              <div className="w3-col m4">
                <label>番地</label>
                <input
                  className="w3-input w3-border"
                  name="clientStreetAddress"
                  value={formik.values.clientStreetAddress}
                  onChange={formik.handleChange}
                  placeholder="1-1-1 渋谷ビル5F"
                />
              </div>

              {/* クライアント担当者情報 */}
              <div className="w3-col m12">
                <h4 className="w3-text-blue">クライアント担当者情報</h4>
              </div>
              <div className="w3-col m12">
                <label>担当者名</label>
                <input
                  className="w3-input w3-border"
                  name="clientContactName"
                  value={formik.values.clientContactName}
                  onChange={formik.handleChange}
                  placeholder="担当者名を入力"
                />
              </div>
              <div className="w3-col m6">
                <label>電話番号</label>
                <input
                  className="w3-input w3-border"
                  name="clientContactPhone"
                  value={formik.values.clientContactPhone}
                  onChange={formik.handleChange}
                  placeholder="03-1234-5678"
                />
              </div>
              <div className="w3-col m6">
                <label>メールアドレス</label>
                <input
                  className="w3-input w3-border"
                  type="email"
                  name="clientContactEmail"
                  value={formik.values.clientContactEmail}
                  onChange={formik.handleChange}
                  placeholder="contact@client.com"
                />
              </div>
              <div className="w3-col m6">
                <label>開始日</label>
                <input
                  className="w3-input w3-border"
                  type="date"
                  name="startDate"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                />
                {formik.touched.startDate && formik.errors.startDate && (
                  <div className="w3-text-red">{formik.errors.startDate}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>終了日</label>
                <input
                  className="w3-input w3-border"
                  type="date"
                  name="endDate"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                />
                <div className="w3-text-orange w3-small" style={{ marginTop: '4px' }}>
                  ⚠️ 終了日を入力すると終了日が近くになるとアラートが表示されます。<br />
                  プロジェクトの終了日を過ぎると、メンバーはプロジェクトから解除できます。
                </div>
                {formik.touched.endDate && formik.errors.endDate && (
                  <div className="w3-text-red">{formik.errors.endDate}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>ステータス</label>
                <select
                  className="w3-select w3-border"
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>              {/* プロジェクトマネージャー */}
              <div className="w3-col m12">
                <label>プロジェクトマネージャー</label>
                <div className="w3-row">
                  <div className="w3-col m10">
                    <div className="w3-border w3-padding" style={{ minHeight: '40px', backgroundColor: '#f9f9f9' }}>
                      {formik.values.managerIds.length === 0 ? (
                        <span className="w3-text-grey">マネージャーが選択されていません</span>
                      ) : (
                        formik.values.managerIds.map(managerId => {
                          // まずmembersDataから探す
                          let manager = (membersData?.users || []).find(u => u.id === managerId);
                          
                          // membersDataにない場合、プロジェクトの既存メンバーから探す
                          if (!manager && project?.members) {
                            const projectMember = project.members.find(m => m.userId === managerId && m.isManager);
                            if (projectMember) {
                              manager = projectMember.user;
                            }
                          }
                          
                          return manager ? (
                            <span key={managerId} className="w3-tag w3-blue w3-margin-right">
                              {manager.lastName} {manager.firstName}
                              {manager.position && ` (${manager.position})`}
                            </span>
                          ) : (
                            <span key={managerId} className="w3-tag w3-orange w3-margin-right">
                              選択済みマネージャー
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="w3-col m2">
                    <button
                      type="button"
                      className="w3-margin-left w3-button w3-blue w3-block"
                      onClick={() => setShowAddManagerDialog(true)}
                    >
                      <FaPlus /> {project ? '追加' : '選択'}
                    </button>
                  </div>
                </div>
                {formik.touched.managerIds && formik.errors.managerIds && !project && (
                  <div className="w3-text-red">{formik.errors.managerIds}</div>
                )}
                {(membersData?.users || []).filter(member => member.role === 'COMPANY' || member.role === 'MANAGER').length === 0 && (
                  <div className="w3-text-orange">
                    マネージャーロールを持つユーザーがいません。プロジェクトを作成するにはマネージャーが必要です。
                  </div>
                )}
              </div>              {/* プロジェクトメンバー */}
              <div className="w3-col m12">
                <label>プロジェクトメンバー</label>
                <div className="w3-row">
                  <div className="w3-col m10">
                    <div className="w3-border w3-padding" style={{ minHeight: '40px', backgroundColor: '#f9f9f9' }}>
                      {formik.values.memberIds.length === 0 ? (
                        <span className="w3-text-grey">メンバーが選択されていません</span>
                      ) : (
                        formik.values.memberIds.map(memberId => {
                          // まずmembersDataから探す
                          let member = (membersData?.users || []).find(u => u.id === memberId);
                          
                          // membersDataにない場合、プロジェクトの既存メンバーから探す
                          if (!member && project?.members) {
                            const projectMember = project.members.find(m => m.userId === memberId && !m.isManager);
                            if (projectMember) {
                              member = projectMember.user;
                            }
                          }
                          
                          return member ? (
                            <span key={memberId} className="w3-tag w3-green w3-margin-right">
                              {member.lastName} {member.firstName}
                              {member.position && ` (${member.position})`}
                            </span>
                          ) : (
                            <span key={memberId} className="w3-tag w3-orange w3-margin-right">
                              選択済みメンバー
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="w3-col m2">
                    <button
                      type="button"
                      className="w3-margin-left w3-button w3-blue w3-block"
                      onClick={() => setShowAddMemberDialog(true)}
                    >
                      <FaPlus /> {project ? '追加' : '選択'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button 
              type="button" 
              className="w3-button w3-gray"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin w3-margin-right" />
                  {project ? '更新中...' : '作成中...'}
                </>
              ) : (
                project ? '更新' : '作成'
              )}
            </button>          </footer>
        </form>

        {/* マネージャー選択ダイアログ */}
        {showAddManagerDialog && (
          <AddMemberDialog
            open={showAddManagerDialog}
            onClose={() => setShowAddManagerDialog(false)}
            project={project}
            onSubmit={handleManagerSelection}
            roleFilter={['COMPANY', 'MANAGER']}
            title="マネージャーを選択"
            preSelectedMemberIds={formik.values.managerIds}
          />
        )}

        {/* メンバー選択ダイアログ */}
        {showAddMemberDialog && (
          <AddMemberDialog
            open={showAddMemberDialog}
            onClose={() => setShowAddMemberDialog(false)}
            project={project}
            onSubmit={handleMemberSelection}
            roleFilter={['MEMBER']}
            excludeIds={formik.values.managerIds}
            title="メンバーを選択"
            preSelectedMemberIds={formik.values.memberIds}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectEditDialog;
