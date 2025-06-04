import React from 'react';
import { useFormik } from 'formik';
import { FaSpinner, FaSave, FaTimes } from 'react-icons/fa';
import { projectSchema } from '../utils/validation';

const statusLabels = {
  ACTIVE: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留',
  CANCELLED: 'キャンセル'
};

const ProjectEditModal = ({ 
  open, 
  onClose, 
  project, 
  onSave, 
  isLoading, 
  membersData,
  currentUser 
}) => {
  const formik = useFormik({
    initialValues: {
      name: project?.name || '',
      description: project?.description || '',
      startDate: project?.startDate ? project.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: project?.endDate ? project.endDate.split('T')[0] : '',
      status: project?.status || 'ACTIVE',
      managerIds: project?.managers?.map(m => m.id) || [],
      managerAllocations: project?.managers?.reduce((acc, manager) => {
        acc[manager.id] = manager.projectMembership?.allocation || 1.0;
        return acc;
      }, {}) || {}
    },
    validationSchema: projectSchema,
    onSubmit: onSave,
    enableReinitialize: true
  });
  if (!open) return null;

  // 現在のユーザー役割に基づくマネージャー候補のフィルタリング
  const getManagerCandidates = () => {
    if (!membersData?.users) return [];
    
    const allUsers = membersData.users;
    
    // 役割別フィルタリングルール
    switch (currentUser?.role) {
      case 'MANAGER':
        // MANAGERロール → 他のMANAGERロールユーザーのみ表示
        return allUsers.filter(user => user.role === 'MANAGER');
        
      case 'COMPANY':
        // COMPANYロール → MANAGERとCOMPANYロールユーザーを表示
        return allUsers.filter(user => user.role === 'MANAGER' || user.role === 'COMPANY');
        
      case 'ADMIN':
        // ADMINロール → MANAGERとCOMPANYロールユーザーを表示
        return allUsers.filter(user => user.role === 'MANAGER' || user.role === 'COMPANY');
        
      default:
        // デフォルト（従来の動作）
        return allUsers.filter(user => user.role === 'MANAGER' || user.role === 'COMPANY');
    }
  };

  const managers = getManagerCandidates();

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <span 
            className="w3-button w3-display-topright w3-hover-red w3-large"
            onClick={onClose}
          >
            <FaTimes />
          </span>
          <h3>{project ? 'プロジェクトを編集' : 'プロジェクトを追加'}</h3>
        </header>

        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container w3-padding" style={{ maxHeight: 'calc(90vh - 160px)', overflowY: 'auto' }}>
            <div className="w3-row-padding">
              {/* プロジェクト名 */}
              <div className="w3-col m12 w3-margin-bottom">
                <label className="w3-text-blue"><strong>プロジェクト名 *</strong></label>
                <input
                  className={`w3-input w3-border ${formik.touched.name && formik.errors.name ? 'w3-border-red' : ''}`}
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="プロジェクト名を入力してください"
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="w3-text-red w3-small">{formik.errors.name}</div>
                )}
              </div>

              {/* 説明 */}
              <div className="w3-col m12 w3-margin-bottom">
                <label className="w3-text-blue"><strong>説明</strong></label>
                <textarea
                  className="w3-input w3-border"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows="3"
                  placeholder="プロジェクトの説明を入力してください"
                />
              </div>

              {/* 開始日・終了日 */}
              <div className="w3-col m6 w3-margin-bottom">
                <label className="w3-text-blue"><strong>開始日 *</strong></label>
                <input
                  className={`w3-input w3-border ${formik.touched.startDate && formik.errors.startDate ? 'w3-border-red' : ''}`}
                  type="date"
                  name="startDate"
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.startDate && formik.errors.startDate && (
                  <div className="w3-text-red w3-small">{formik.errors.startDate}</div>
                )}
              </div>

              <div className="w3-col m6 w3-margin-bottom">
                <label className="w3-text-blue"><strong>終了日</strong></label>
                <input
                  className="w3-input w3-border"
                  type="date"
                  name="endDate"
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min={formik.values.startDate}
                />
              </div>

              {/* ステータス */}
              <div className="w3-col m6 w3-margin-bottom">
                <label className="w3-text-blue"><strong>ステータス</strong></label>
                <select
                  className="w3-select w3-border"
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* プロジェクトマネージャー */}
              <div className="w3-col m12 w3-margin-bottom">
                <label className="w3-text-blue"><strong>プロジェクトマネージャー *</strong></label>
                <select
                  className={`w3-select w3-border ${formik.touched.managerIds && formik.errors.managerIds ? 'w3-border-red' : ''}`}
                  name="managerIds"
                  multiple
                  value={formik.values.managerIds}
                  onChange={(e) => {
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
                        newAllocations[managerId] = 1.0;
                      }
                    });
                    // 選択解除されたマネージャーの工数を削除
                    Object.keys(newAllocations).forEach(managerId => {
                      if (!value.includes(managerId)) {
                        delete newAllocations[managerId];
                      }
                    });
                    formik.setFieldValue('managerAllocations', newAllocations);
                  }}
                  size="5"
                >
                  {managers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                      {member.position ? ` (${member.position})` : ''}
                      {member.totalAllocation ? ` - 現在の総工数: ${Math.round(member.totalAllocation * 100)}%` : ''}
                    </option>
                  ))}
                </select>
                {formik.touched.managerIds && formik.errors.managerIds && (
                  <div className="w3-text-red w3-small">{formik.errors.managerIds}</div>
                )}
                {managers.length === 0 && (
                  <div className="w3-panel w3-orange w3-small">
                    <p>マネージャーロールを持つユーザーがいません。プロジェクトを作成するにはマネージャーが必要です。</p>
                  </div>
                )}
                <div className="w3-small w3-text-grey w3-margin-top">
                  Ctrlキーを押しながらクリックで複数選択できます
                </div>
              </div>
              
              {/* マネージャーの工数設定 */}
              {formik.values.managerIds.length > 0 && (
                <div className="w3-col m12 w3-margin-bottom">
                  <h4 className="w3-text-blue">マネージャーの工数設定</h4>
                  <div className="w3-responsive">
                    <table className="w3-table w3-bordered w3-striped">
                      <thead>
                        <tr className="w3-light-blue">
                          <th>マネージャー</th>
                          <th>現在の総工数</th>
                          <th>このプロジェクトでの工数</th>
                          <th>変更後の総工数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formik.values.managerIds.map(managerId => {
                          const manager = managers.find(u => u.id === managerId);
                          const allocation = formik.values.managerAllocations[managerId] || 1.0;
                          const totalAllocation = manager?.totalAllocation || 0;
                          const currentProjectAllocation = project?.managers?.find(m => m.id === managerId)?.projectMembership?.allocation || 0;
                          const newTotal = totalAllocation - currentProjectAllocation + allocation;
                          const isExceeded = newTotal > 1.0;

                          return (
                            <tr key={managerId} className={isExceeded ? 'w3-light-red' : ''}>
                              <td>
                                <strong>{manager?.firstName} {manager?.lastName}</strong>
                                <br />
                                <small className="w3-text-grey">{manager?.position || '役職未設定'}</small>
                              </td>
                              <td>
                                <span className={`w3-tag w3-round ${totalAllocation >= 1.0 ? 'w3-red' : totalAllocation >= 0.8 ? 'w3-orange' : 'w3-green'}`}>
                                  {Math.round(totalAllocation * 100)}%
                                </span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  className={`w3-input w3-border ${isExceeded ? 'w3-border-red' : ''}`}
                                  value={allocation}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    formik.setFieldValue(`managerAllocations.${managerId}`, newValue);
                                  }}
                                  style={{ width: '100px' }}
                                />
                                <small className="w3-text-grey">0.0 - 1.0</small>
                              </td>
                              <td>
                                <span className={`w3-tag w3-round ${isExceeded ? 'w3-red' : newTotal >= 0.8 ? 'w3-orange' : 'w3-green'}`}>
                                  {Math.round(newTotal * 100)}%
                                </span>
                                {isExceeded && (
                                  <div className="w3-text-red w3-small">
                                    工数が100%を超えています
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="w3-container w3-padding w3-light-grey">
            <div className="w3-bar">
              <button 
                type="button" 
                className="w3-button w3-grey"
                onClick={onClose}
                disabled={isLoading}
              >
                <FaTimes className="w3-margin-right" />
                キャンセル
              </button>
              <button
                type="submit"
                className="w3-button w3-blue w3-right"
                disabled={isLoading || !formik.isValid}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="fa-spin w3-margin-right" />
                    {project ? '更新中...' : '作成中...'}
                  </>
                ) : (
                  <>
                    <FaSave className="w3-margin-right" />
                    {project ? '更新' : '作成'}
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectEditModal;
