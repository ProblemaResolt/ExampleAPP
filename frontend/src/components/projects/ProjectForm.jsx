import React, { useState, useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import { FaSpinner, FaPlus, FaUsers, FaTimes } from 'react-icons/fa';
import AddMemberDialog from '../AddMemberDialog';
import api from '../../utils/axios';

/**
 * プロジェクト作成・編集用フォームコンポーネント
 * ページモードとモーダルモードに対応
 */
const ProjectForm = ({ 
  project = null, // 編集時のプロジェクトデータ
  onSubmit, 
  isSubmitting = false,
  onCancel,
  isPageMode = false // true: ページ表示, false: モーダル表示
}) => {
  const [showAddManagerDialog, setShowAddManagerDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  
  // 初期化済みフラグ（無限初期化を防ぐ）
  const isInitializedRef = useRef(false);
  const projectIdRef = useRef(null);// ユーザー一覧を取得
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    }
  });

  // 全プロジェクトデータを取得（工数計算のため）
  const { data: allProjectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    }
  });

  const users = usersData?.data?.users || [];// 選択されたメンバーの情報を取得する関数
  const getSelectedMembers = (selectedIds) => {
    return selectedIds.map(id => 
      users.find(user => user.id === id)
    ).filter(Boolean);
  };
  // メンバーを削除する関数
  const removeMember = (memberId, type) => {
    if (type === 'manager') {
      const newManagerIds = formik.values.managerIds.filter(id => id !== memberId);
      formik.setFieldValue('managerIds', newManagerIds);
    } else {
      const newMemberIds = formik.values.memberIds.filter(id => id !== memberId);
      formik.setFieldValue('memberIds', newMemberIds);
    }
  };  // 総工数計算関数（AddMemberDialogと同じロジック）
  const calculateTotalAllocation = (userId) => {
    if (!allProjectsData?.data?.projects) return 0;
    
    let total = 0;
    allProjectsData.data.projects.forEach(proj => {
      // 編集中のプロジェクトは除外
      if (project && proj.id === project.id) return;
      
      proj.members?.forEach(membership => {
        if (membership.userId === userId || membership.user?.id === userId) {
          total += membership.allocation || 0;
        }
      });
    });
    return total;
  };
  const formik = useFormik({
    initialValues: {
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
      memberIds: project?.members?.filter(m => !m.isManager).map(m => m.user.id) || []    },
    enableReinitialize: false, // 再初期化を無効にして手動制御
    validate: (values) => {
      const errors = {};
      
      // 必須フィールドのバリデーション
      if (!values.name || values.name.trim() === '') {
        errors.name = 'プロジェクト名は必須です';
      }
      
      if (!values.startDate) {
        errors.startDate = '開始日は必須です';
      }
      
      // 終了日が開始日より前でないかチェック
      if (values.endDate && values.startDate && values.endDate < values.startDate) {
        errors.endDate = '終了日は開始日以降の日付を設定してください';
      }
      
      // メールアドレスの形式チェック
      if (values.clientContactEmail && values.clientContactEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values.clientContactEmail)) {
          errors.clientContactEmail = '有効なメールアドレスを入力してください';
        }
      }
      
      return errors;
    },
    onSubmit: (values, actions) => {      
      const submitValues = { ...values };
      if (!project) {
        submitValues.isCreating = true;
      }
        onSubmit(submitValues, actions);
    }
  });  // プロジェクトデータが変更された場合のみformikの値を更新
  useEffect(() => {
    const currentProjectId = project?.id;
    
    // 初回または異なるプロジェクトの場合のみ初期化
    if (!isInitializedRef.current || projectIdRef.current !== currentProjectId) {
      const newInitialValues = {
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
      };
      
      formik.resetForm({ values: newInitialValues });
      
      isInitializedRef.current = true;
      projectIdRef.current = currentProjectId;
    }
  }, [project]); // formikを依存配列から除外して無限ループを防ぐ  // マネージャー選択時の処理
  const handleManagerSelection = (newlySelectedManagers) => {
    // 既存マネージャーID + 新規選択マネージャーIDを合成
    const currentManagerIds = formik.values.managerIds || [];
    const newManagerIds = newlySelectedManagers.map(manager => manager.id);
    const allManagerIds = [...new Set([...currentManagerIds, ...newManagerIds])]; // 重複除去
    
    formik.setFieldValue('managerIds', allManagerIds);
    setShowAddManagerDialog(false);
  };  // メンバー選択時の処理
  const handleMemberSelection = (newlySelectedMembers) => {
    // 既存メンバーID + 新規選択メンバーIDを合成
    const currentMemberIds = formik.values.memberIds || [];
    const newMemberIds = newlySelectedMembers.map(member => member.id);
    const allMemberIds = [...new Set([...currentMemberIds, ...newMemberIds])]; // 重複除去
    
    formik.setFieldValue('memberIds', allMemberIds);
    setShowAddMemberDialog(false);
  };

  return (
    <div className={isPageMode ? 'w3-white' : ''}>
      {/* ページモード用ヘッダー */}
      {isPageMode && (
        <header className="w3-container w3-blue w3-padding">
          <h2>{project ? 'プロジェクトを編集' : '新しいプロジェクトを作成'}</h2>
        </header>
      )}

      <form onSubmit={formik.handleSubmit}>
        <div className="w3-container w3-padding">
          <div className="w3-row-padding">
            {/* プロジェクト名 */}
            <div className="w3-col m12">
              <label className="w3-text-bold">プロジェクト名 *</label>
              <input
                className={`w3-input w3-border ${formik.errors.name ? 'w3-border-red' : ''}`}
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                placeholder="プロジェクト名を入力"
                required
              />
              {formik.errors.name && <span className="w3-text-red w3-small">{formik.errors.name}</span>}
            </div>

            {/* プロジェクト説明 */}
            <div className="w3-col m12">
              <label className="w3-text-bold">プロジェクト説明</label>
              <textarea
                className="w3-input w3-border"
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                placeholder="プロジェクトの概要を入力"
                rows="3"
              />
            </div>

            {/* 日程設定 */}
            <div className="w3-col m6">
              <label className="w3-text-bold">開始日 *</label>
              <input
                className={`w3-input w3-border ${formik.errors.startDate ? 'w3-border-red' : ''}`}
                type="date"
                name="startDate"
                value={formik.values.startDate}
                onChange={formik.handleChange}
                required
              />
              {formik.errors.startDate && <span className="w3-text-red w3-small">{formik.errors.startDate}</span>}
            </div>

            <div className="w3-col m6">
              <label className="w3-text-bold">終了予定日</label>
              <input
                className="w3-input w3-border"
                type="date"
                name="endDate"
                value={formik.values.endDate}
                onChange={formik.handleChange}
              />
            </div>

            {/* ステータス */}
            <div className="w3-col m12">
              <label className="w3-text-bold">ステータス</label>
              <select
                className="w3-select w3-border"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
              >
                <option value="PLANNED">計画中</option>
                <option value="IN_PROGRESS">進行中</option>
                <option value="COMPLETED">完了</option>
                <option value="ON_HOLD">一時停止</option>
              </select>
            </div>
          </div>

          {/* クライアント情報セクション */}
          <div className="w3-section">
            <h4 className="w3-text-blue w3-border-bottom">クライアント情報</h4>
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>クライアント企業名</label>
                <input
                  className="w3-input w3-border"
                  name="clientCompanyName"
                  value={formik.values.clientCompanyName}
                  onChange={formik.handleChange}
                  placeholder="株式会社○○"
                />
              </div>

              <div className="w3-col m6">
                <label>担当者名</label>
                <input
                  className="w3-input w3-border"
                  name="clientContactName"
                  value={formik.values.clientContactName}
                  onChange={formik.handleChange}
                  placeholder="担当者名"
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
                  placeholder="client@example.com"
                />
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
                <label>住所</label>
                <input
                  className="w3-input w3-border"
                  name="clientStreetAddress"
                  value={formik.values.clientStreetAddress}
                  onChange={formik.handleChange}
                  placeholder="1-1-1 渋谷ビル5F"
                />
              </div>
            </div>
          </div>

          {/* チーム設定セクション */}
          <div className="w3-section">
            <h4 className="w3-text-blue w3-border-bottom">チーム設定</h4>
            
            {/* マネージャー設定 */}
            <div className="w3-margin-bottom">
              <label className="w3-text-bold">プロジェクトマネージャー *</label>
              <div className="w3-bar">
                <button
                  type="button"
                  className="w3-button w3-blue w3-small"
                  onClick={() => setShowAddManagerDialog(true)}
                >
                  <FaUsers className="w3-margin-right" />
                  マネージャーを選択
                </button>
              </div>              {formik.values.managerIds.length > 0 && (
                <div className="w3-margin-top">
                  <div className="w3-card w3-white w3-round w3-padding">
                    <h6 className="w3-text-blue w3-border-bottom w3-padding-bottom">
                      <FaUsers className="w3-margin-right" />
                      選択されたマネージャー ({formik.values.managerIds.length}名)
                    </h6>
                    <div className="w3-margin-top">
                      {getSelectedMembers(formik.values.managerIds).map(member => (
                        <div key={member.id} className="w3-border-left w3-border-blue w3-padding-small w3-margin-bottom" style={{ borderLeftWidth: '4px' }}>
                          <div className="w3-row">
                            <div className="w3-col s10">
                              <strong>{member.lastName} {member.firstName}</strong>
                              <div className="w3-small w3-text-gray">{member.email || 'メールアドレス未設定'}</div>
                            </div>
                            <div className="w3-col s2 w3-right-align">
                              <button
                                type="button"
                                className="w3-button w3-small w3-red w3-round"
                                onClick={() => removeMember(member.id, 'manager')}
                                title="削除"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {!project && formik.values.managerIds.length === 0 && (
                <span className="w3-text-red w3-small">※ プロジェクトマネージャーを選択してください</span>
              )}
            </div>

            {/* メンバー設定 */}
            <div className="w3-margin-bottom">
              <label className="w3-text-bold">プロジェクトメンバー</label>
              <div className="w3-bar">
                <button
                  type="button"
                  className="w3-button w3-green w3-small"
                  onClick={() => setShowAddMemberDialog(true)}
                >
                  <FaPlus className="w3-margin-right" />
                  メンバーを追加
                </button>
              </div>              {formik.values.memberIds.length > 0 && (
                <div className="w3-margin-top">
                  <div className="w3-card w3-white w3-round w3-padding">
                    <h6 className="w3-text-green w3-border-bottom w3-padding-bottom">
                      <FaUsers className="w3-margin-right" />
                      選択されたメンバー ({formik.values.memberIds.length}名)
                    </h6>
                    <div className="w3-margin-top">
                      {getSelectedMembers(formik.values.memberIds).map(member => (
                        <div key={member.id} className="w3-border-left w3-border-green w3-padding-small w3-margin-bottom" style={{ borderLeftWidth: '4px' }}>
                          <div className="w3-row">
                            <div className="w3-col s10">
                              <strong>{member.lastName} {member.firstName}</strong>
                              <div className="w3-small w3-text-gray">{member.email || 'メールアドレス未設定'}</div>
                            </div>
                            <div className="w3-col s2 w3-right-align">
                              <button
                                type="button"
                                className="w3-button w3-small w3-red w3-round"
                                onClick={() => removeMember(member.id, 'member')}
                                title="削除"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター（ボタン） */}
        <footer className="w3-container w3-padding w3-border-top">
          <div className="w3-bar">
            <button
              type="button"
              className="w3-button w3-grey"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={isSubmitting || (!project && formik.values.managerIds.length === 0)}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="fa-spin w3-margin-right" />
                  {project ? '更新中...' : '作成中...'}
                </>
              ) : (
                project ? '更新' : '作成'
              )}
            </button>
          </div>
        </footer>
      </form>      {/* マネージャー選択ダイアログ */}
      {showAddManagerDialog && (
        <AddMemberDialog
          open={showAddManagerDialog}
          onClose={() => setShowAddManagerDialog(false)}
          project={project}
          onSubmit={handleManagerSelection}
          roleFilter={['COMPANY', 'MANAGER']}
          title="マネージャーを選択"
          preSelectedMemberIds={formik.values.managerIds}
          calculateTotalAllocation={calculateTotalAllocation}
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
          calculateTotalAllocation={calculateTotalAllocation}
        />
      )}
    </div>
  );
};

export default ProjectForm;
