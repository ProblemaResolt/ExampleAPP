import React from 'react';
import { useFormik } from 'formik';
import { FaSpinner } from 'react-icons/fa';
import { projectSchema, statusLabels } from '../utils/validation';

const ProjectEditDialog = ({ 
  open, 
  onClose, 
  project, 
  onSubmit, 
  membersData, 
  isSubmitting = false 
}) => {
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
      status: project?.status || 'ACTIVE',
      managerIds: project?.managers?.map(m => m.id) || [],
      managerAllocations: project?.managers?.reduce((acc, manager) => {
        acc[manager.id] = manager.projectMembership?.allocation || 1.0;
        return acc;
      }, {}) || {}
    },
    enableReinitialize: true,
    validationSchema: projectSchema,
    onSubmit: onSubmit
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
        formik.setFieldValue('clientContactName', `${manager.firstName} ${manager.lastName}`);
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
  };

  // マネージャーが変更された場合の処理
  const handleManagerChange = (e) => {
    const options = e.target.options;
    const value = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(options[i].value);
      }
    }
    formik.setFieldValue('managerIds', value);
    
    // 新しく選択されたマネージャーのデフォルト工数を設定
    const newAllocations = { ...formik.values.managerAllocations };
    value.forEach(managerId => {
      if (!newAllocations[managerId]) {
        newAllocations[managerId] = 1.0; // デフォルト100%
      }
    });
    // 選択解除されたマネージャーの工数を削除
    Object.keys(newAllocations).forEach(managerId => {
      if (!value.includes(managerId)) {
        delete newAllocations[managerId];
      }
    });
    formik.setFieldValue('managerAllocations', newAllocations);

    // 自社案件の場合は担当者情報を更新
    if (formik.values.clientCompanyName === '自社' && value.length > 0) {
      const firstManagerId = value[0];
      const manager = (membersData?.users || []).find(u => u.id === firstManagerId);
      
      if (manager) {
        formik.setFieldValue('clientContactName', `${manager.firstName} ${manager.lastName}`);
        formik.setFieldValue('clientContactEmail', manager.email);
        formik.setFieldValue('clientContactPhone', manager.phone || '');
        if (manager.prefecture || manager.city || manager.streetAddress) {
          formik.setFieldValue('clientPrefecture', manager.prefecture || '');
          formik.setFieldValue('clientCity', manager.city || '');
          formik.setFieldValue('clientStreetAddress', manager.streetAddress || '');
        }
      }
    }
  };

  const isInternalProject = formik.values.clientCompanyName === '自社';

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
              </div>
              <div className="w3-col m12">
                <label>プロジェクトマネージャー</label>                <select
                  className="w3-select w3-border"
                  name="managerIds"
                  multiple
                  value={formik.values.managerIds}
                  onChange={handleManagerChange}
                >
                  {(membersData?.users || [])
                    .filter(member => member.role === 'COMPANY' || member.role === 'MANAGER')
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                        {member.position ? ` (${member.position})` : ''}
                        {member.totalAllocation ? ` (現在の総工数: ${Math.round(member.totalAllocation * 100)}%)` : ''}
                      </option>
                  ))}
                </select>
                {formik.touched.managerIds && formik.errors.managerIds && (
                  <div className="w3-text-red">{formik.errors.managerIds}</div>
                )}
                {(membersData?.users || []).filter(member => member.role === 'COMPANY' || member.role === 'MANAGER').length === 0 && (
                  <div className="w3-text-orange">
                    マネージャーロールを持つユーザーがいません。プロジェクトを作成するにはマネージャーが必要です。
                  </div>
                )}
              </div>
              
              {/* マネージャーの工数設定 */}
              {formik.values.managerIds.length > 0 && (
                <div className="w3-col m12">
                  <h4>マネージャーの工数設定</h4>
                  {formik.values.managerIds.map(managerId => {
                    const manager = (membersData?.users || []).find(u => u.id === managerId);
                    const allocation = formik.values.managerAllocations[managerId] || 1.0;
                    const totalAllocation = manager?.totalAllocation || 0;
                    const newTotal = totalAllocation - (project?.managers?.find(m => m.id === managerId)?.projectMembership?.allocation || 0) + allocation;
                    const isExceeded = newTotal > 1.0;
                    
                    return (
                      <div key={managerId} className="w3-row w3-margin-bottom">
                        <div className="w3-col m6">
                          <label>{manager?.firstName} {manager?.lastName}</label>
                          <div className="w3-text-grey w3-small">
                            現在の総工数: {Math.round(totalAllocation * 100)}%
                            {project && project.managers?.find(m => m.id === managerId) && (
                              <span> → 新しい総工数: <span className={isExceeded ? 'w3-text-red' : 'w3-text-green'}>{Math.round(newTotal * 100)}%</span></span>
                            )}
                          </div>
                        </div>
                        <div className="w3-col m6">
                          <input
                            className={`w3-input w3-border ${isExceeded ? 'w3-border-red' : ''}`}
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={allocation}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              formik.setFieldValue(`managerAllocations.${managerId}`, value);
                            }}
                            placeholder="工数 (0.0 - 1.0)"
                          />
                          <div className="w3-text-grey w3-small">
                            {Math.round(allocation * 100)}%
                            {isExceeded && (
                              <div className="w3-text-red">⚠️ 総工数が100%を超えています</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectEditDialog;
