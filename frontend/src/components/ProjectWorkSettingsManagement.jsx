import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCog, FaPlus, FaEdit, FaTrash, FaUserPlus } from 'react-icons/fa';
import api from '../utils/axios';

const ProjectWorkSettingsManagement = ({ 
  projectId, 
  projectName, 
  currentUser, 
  showHeader = false, 
  cardStyle = 'w3-white',
  personalMode = false
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState(null);
  const [showUserAssignModal, setShowUserAssignModal] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  // 勤務設定一覧の取得（管理者モード）
  const { data: workSettingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['projectWorkSettings', projectId],
    queryFn: async () => {
      const response = await api.get(`/project-work-settings/project/${projectId}/work-settings`);
      return response.data;
    },
    enabled: !!projectId && !personalMode
  });  // 個人の勤務設定取得（個人モード）
  const { data: personalWorkSettings, isLoading: isLoadingPersonalSettings } = useQuery({
    queryKey: ['personalProjectWorkSettings', projectId, currentUser?.id],
    queryFn: async () => {
      const response = await api.get(`/project-work-settings/personal/${projectId}/my-settings`);
      return response.data;
    },
    enabled: !!projectId && !!currentUser?.id && personalMode
  });// プロジェクト詳細とメンバー情報の取得
  const { data: projectDetailsData, isLoading: isLoadingProject } = useQuery({
    queryKey: ['projectDetails', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      if (response.data.data?.project?.members?.length > 0) {
      }
      return response.data;
    },
    enabled: !!projectId
  });
  // 利用可能なユーザー一覧の取得
  const { data: availableUsers } = useQuery({
    queryKey: ['availableUsers'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    }
  });  // 勤務設定作成（管理者モード）
  const createSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/project-work-settings/project/${projectId}/work-settings`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectWorkSettings', projectId]);
      queryClient.invalidateQueries(['projectDetails', projectId]);
      setShowCreateModal(false);
      setSuccess('勤務設定を作成しました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '勤務設定の作成に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  // 個人勤務設定作成・更新（個人モード）
  const createPersonalSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/project-work-settings/personal/${projectId}/my-settings`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['personalProjectWorkSettings', projectId, currentUser?.id]);
      queryClient.invalidateQueries(['projectDetails', projectId]);
      setShowCreateModal(false);
      setEditingSettings(null);
      setSuccess(personalWorkSettings?.data?.hasSettings ? '勤務設定を更新しました' : '勤務設定を作成しました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '勤務設定の保存に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  // 勤務設定更新
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ settingsId, data }) => {
      const response = await api.put(`/project-work-settings/work-settings/${settingsId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectWorkSettings', projectId]);
      queryClient.invalidateQueries(['projectDetails', projectId]);
      setEditingSettings(null);
      setSuccess('勤務設定を更新しました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '勤務設定の更新に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  // 勤務設定削除
  const deleteSettingsMutation = useMutation({
    mutationFn: async (settingsId) => {
      await api.delete(`/project-work-settings/work-settings/${settingsId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectWorkSettings', projectId]);
      queryClient.invalidateQueries(['projectDetails', projectId]);
      setSuccess('勤務設定を削除しました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '勤務設定の削除に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  // ユーザー割り当て
  const assignUsersMutation = useMutation({
    mutationFn: async ({ settingsId, userIds }) => {
      const response = await api.post(`/project-work-settings/work-settings/${settingsId}/assign-users`, { userIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectWorkSettings', projectId]);
      queryClient.invalidateQueries(['projectDetails', projectId]);
      setShowUserAssignModal(null);
      setSuccess('ユーザーを割り当てました');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'ユーザーの割り当てに失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  });
  // アクセス権限チェック
  const canManageSettings = personalMode 
    ? !!currentUser // 個人モードではログインユーザーなら誰でも自分の設定を管理可能
    : (currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY' || currentUser?.role === 'MANAGER'); // 管理者モードでは管理権限が必要

  if (!canManageSettings) {
    return (
      <div className="w3-panel w3-orange">
        <p>{personalMode ? 'ログインが必要です。' : 'プロジェクト勤務設定の管理権限がありません。'}</p>
      </div>
    );
  }
  return (
    <div className="w3-container">
      {/* ヘッダー（showHeaderがtrueの場合のみ表示） */}
      {showHeader && (
        <div className="w3-panel w3-blue">
          <h3>
            <FaCog className="w3-margin-right" />
            {personalMode ? `${projectName} - 個人勤務設定` : `${projectName} - 勤務設定管理`}
          </h3>
        </div>
      )}

      {/* 成功・エラーメッセージ */}
      {success && (
        <div className="w3-panel w3-green w3-display-container">
          <span className="w3-button w3-green w3-large w3-display-topright" onClick={() => setSuccess('')}>×</span>
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div className="w3-panel w3-red w3-display-container">
          <span className="w3-button w3-red w3-large w3-display-topright" onClick={() => setError('')}>×</span>
          <p>{error}</p>
        </div>
      )}

      {/* ローディング */}
      {(isLoadingSettings || isLoadingProject || isLoadingPersonalSettings) && (
        <div className="w3-center w3-padding-large">
          <i className="fa fa-spinner fa-spin fa-2x"></i>
          <p>読み込み中...</p>
        </div>
      )}

      {/* 個人モードの内容 */}
      {personalMode ? (
        <PersonalSettingsView 
          personalWorkSettings={personalWorkSettings}
          projectName={projectName}
          onEdit={() => {
            if (personalWorkSettings?.data?.hasSettings) {
              setEditingSettings(personalWorkSettings.data.settings);
            }
            setShowCreateModal(true);
          }}
          onCreate={() => setShowCreateModal(true)}
        />
      ) : (
        // 管理者モードの内容（既存の内容）
        <>
          {/* メンバー設定状況 */}
          {!isLoadingProject && projectDetailsData?.data?.project?.members && (
            <div className="w3-margin-bottom">
              <h4>メンバー設定状況</h4>
              
              <table className="w3-table w3-border">
                <thead>
                  <tr className="w3-blue">
                    <th>メンバー</th>
                    <th>設定状況</th>
                    <th>勤務時間</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDetailsData.data.project.members.map((member, index) => {
                    const user = member.user || member;
                    
                    // ステータス判定ロジックの修正
                    const hasWorkSettings = !!(
                      member.workSettingsAssignment?.projectWorkSettingName ||
                      member.workSettingsAssignment?.workStartTime ||
                      (member.workSettingsAssignment && Object.keys(member.workSettingsAssignment).length > 0)
                    );
                    
                    return (
                      <tr key={user.id || index}>
                        <td>{user.name || user.lastName + ' ' + user.firstName || '名前不明'}</td>
                        <td>
                          {hasWorkSettings ? (
                            <span className="w3-tag w3-green w3-small">設定済み</span>
                          ) : (
                            <span className="w3-tag w3-red w3-small">未設定</span>
                          )}
                        </td>
                        <td>
                          {member.workSettingsAssignment?.workStartTime && member.workSettingsAssignment?.workEndTime ? 
                            `${member.workSettingsAssignment.workStartTime} - ${member.workSettingsAssignment.workEndTime}` 
                            : (member.workSettingsAssignment?.projectWorkSettings ? 
                              `${member.workSettingsAssignment.projectWorkSettings.workStartTime} - ${member.workSettingsAssignment.projectWorkSettings.workEndTime}` 
                              : '未設定')
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 新規作成ボタン */}
          <div className="w3-margin-bottom">
            <button
              className="w3-button w3-blue"
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus className="w3-margin-right" />
              新しい勤務設定を作成
            </button>
          </div>

          {/* 勤務設定一覧 */}
          {workSettingsData?.data?.workSettings && workSettingsData.data.workSettings.length > 0 && (
            <div className="w3-margin-bottom">
              <h4>勤務設定一覧</h4>
              <table className="w3-table w3-border">
                <thead>
                  <tr className="w3-blue">
                    <th>勤務時間</th>
                    <th>休憩時間</th>
                    <th>割り当て人数</th>
                    <th>編集</th>
                  </tr>
                </thead>
                <tbody>
                  {workSettingsData.data.workSettings.map(setting => (
                    <tr key={setting.id}>
                      <td>{setting.workStartTime} - {setting.workEndTime}</td>
                      <td>{setting.breakDuration}分</td>
                      <td>{setting.userAssignments?.length || 0}名</td>
                      <td>
                        <button
                          className="w3-button w3-small w3-blue w3-margin-right"
                          onClick={() => setEditingSettings(setting)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="w3-button w3-small w3-green w3-margin-right"
                          onClick={() => setShowUserAssignModal(setting)}
                        >
                          <FaUserPlus />
                        </button>
                        <button
                          className="w3-button w3-small w3-red"
                          onClick={() => {
                            if (window.confirm('この勤務設定を削除しますか？')) {
                              deleteSettingsMutation.mutate(setting.id);
                            }
                          }}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {workSettingsData?.data?.workSettings && workSettingsData.data.workSettings.length === 0 && (
            <div className="w3-panel w3-pale-yellow w3-border">
              <p>まだ勤務設定が作成されていません。</p>
            </div>
          )}
        </>
      )}      {/* モーダル */}
      {showCreateModal && (
        <WorkSettingsModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSettings(null);
          }}
          onSave={(data) => {
            if (personalMode) {
              createPersonalSettingsMutation.mutate(data);
            } else {
              createSettingsMutation.mutate(data);
            }
          }}
          isLoading={personalMode ? createPersonalSettingsMutation.isPending : createSettingsMutation.isPending}
          title={personalMode 
            ? (editingSettings ? "勤務設定を編集" : "勤務設定を作成") 
            : "新しい勤務設定を作成"
          }
          initialData={editingSettings}
          personalMode={personalMode}
        />
      )}

      {editingSettings && !personalMode && (
        <WorkSettingsModal
          isOpen={!!editingSettings}
          onClose={() => setEditingSettings(null)}
          onSave={(data) => updateSettingsMutation.mutate({ settingsId: editingSettings.id, data })}
          isLoading={updateSettingsMutation.isPending}
          title="勤務設定を編集"
          initialData={editingSettings}
          personalMode={personalMode}
        />
      )}

      {showUserAssignModal && !personalMode && (
        <UserAssignModal
          isOpen={!!showUserAssignModal}
          onClose={() => setShowUserAssignModal(null)}
          onSave={(userIds) => assignUsersMutation.mutate({ settingsId: showUserAssignModal.id, userIds })}
          isLoading={assignUsersMutation.isPending}
          availableUsers={availableUsers?.data?.users || []}
          assignedUsers={showUserAssignModal.userAssignments || []}
          settingsName={`${showUserAssignModal.workStartTime}-${showUserAssignModal.workEndTime}`}
        />
      )}
    </div>
  );
};

// 個人設定表示コンポーネント
const PersonalSettingsView = ({ personalWorkSettings, projectName, onEdit, onCreate }) => {
  // デバッグ用ログを追加
  
  // より堅牢な判定ロジック
  const hasSettings = !!(
    personalWorkSettings?.data?.hasSettings ||
    personalWorkSettings?.data?.settings ||
    (personalWorkSettings?.data && Object.keys(personalWorkSettings.data).length > 0 && personalWorkSettings.data !== null)
  );
  
  const settings = personalWorkSettings?.data?.settings || personalWorkSettings?.data;


  if (!hasSettings) {
    return (
      <div className="w3-panel w3-pale-yellow w3-border-yellow w3-round">
        <h5>
          <FaCog className="w3-margin-right" />
          勤務設定が未設定です
        </h5>
        <p>このプロジェクトでの勤務設定がまだ作成されていません。</p>
        <p>あなたの勤務時間、休憩時間、勤務場所を設定してください。</p>
        <button 
          className="w3-button w3-blue w3-margin-top"
          onClick={onCreate}
        >
          <FaPlus className="w3-margin-right" />
          勤務設定を作成
        </button>
      </div>
    );
  }

  return (
    <div>
        <header className="w3-container w3-green">
          <h5>
            <FaCog className="w3-margin-right" />
            現在の勤務設定
          </h5>
        </header>
        <div className="w3-container w3-padding">
          <table className="w3-table">
            <tbody>
              <tr>
                <td className="w3-quarter"><strong>規定の勤務時間</strong></td>
                <td>{settings.workStartTime} - {settings.workEndTime}</td>
              </tr>
              <tr>
                <td><strong>休憩時間</strong></td>
                <td>{settings.breakDuration}分</td>
              </tr>
              <tr>
                <td><strong>勤務場所</strong></td>
                <td>{settings.workLocation || '未設定'}</td>
              </tr>
              {settings.createdAt && (
                <tr>
                  <td><strong>作成日</strong></td>
                  <td>{new Date(settings.createdAt).toLocaleDateString('ja-JP')}</td>
                </tr>
              )}
              {settings.updatedAt && settings.updatedAt !== settings.createdAt && (
                <tr>
                  <td><strong>更新日</strong></td>
                  <td>{new Date(settings.updatedAt).toLocaleDateString('ja-JP')}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="w3-margin-top">
            <button 
              className="w3-button w3-blue"
              onClick={onEdit}
            >
              <FaEdit className="w3-margin-right" />
              設定を編集
            </button>
          </div>
        </div>
    </div>
  );
};

// 勤務設定作成・編集モーダル
const WorkSettingsModal = ({ isOpen, onClose, onSave, isLoading, title, initialData }) => {
  // 曜日名と数値のマッピング
  const dayNameToNumber = {
    'SUNDAY': 0,
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6
  };
  
  const dayNumberToName = {
    0: 'SUNDAY',
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY'
  };

  const [formData, setFormData] = useState({
    name: '個人勤務設定',
    workStartTime: '09:00',
    workEndTime: '18:00',
    breakDuration: 60,
    workLocation: '',
    overtimeThreshold: 8,
    weekStartDay: 'MONDAY'
  });  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '個人勤務設定',
        workStartTime: initialData.workStartTime?.slice(0, 5) || '09:00',
        workEndTime: initialData.workEndTime?.slice(0, 5) || '18:00',
        breakDuration: initialData.breakDuration || 60,
        workLocation: initialData.workLocation || '',
        overtimeThreshold: initialData.overtimeThreshold || 8,
        weekStartDay: dayNumberToName[initialData.weekStartDay] || 'MONDAY'
      });
    }
  }, [initialData, dayNumberToName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const [startHour, startMin] = formData.workStartTime.split(':').map(Number);
    const [endHour, endMin] = formData.workEndTime.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;
    
    const workDurationMinutes = endTimeMinutes >= startTimeMinutes 
      ? endTimeMinutes - startTimeMinutes 
      : (24 * 60) - startTimeMinutes + endTimeMinutes;
    
    const workDurationHours = workDurationMinutes / 60;
    const breakDurationHours = formData.breakDuration / 60;
    const standardHours = workDurationHours - breakDurationHours;
    
    if (standardHours < 1 || standardHours > 12) {
      alert(`標準勤務時間（${standardHours.toFixed(2)}時間）は1-12時間の範囲で設定してください。`);
      return;
    }
      const submitData = {
      ...formData,
      standardHours: parseFloat(standardHours.toFixed(2)),
      overtimeThreshold: parseFloat(formData.overtimeThreshold),
      weekStartDay: dayNameToNumber[formData.weekStartDay] // 文字列を数値に変換
    };
    
    onSave(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <span className="w3-button w3-display-topright" onClick={onClose}>×</span>
          <h2>{title}</h2>
        </header>        <form onSubmit={handleSubmit} className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>設定名</b></label>
            <input
              type="text"
              className="w3-input w3-border"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="個人勤務設定"
            />
          </div>

          <div className="w3-row-padding">
            <div className="w3-half w3-margin-bottom">
              <label className="w3-text-blue"><b>勤務開始時刻</b></label>
              <input
                type="time"
                className="w3-input w3-border"
                value={formData.workStartTime}
                onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                required
              />
            </div>
            <div className="w3-half w3-margin-bottom">
              <label className="w3-text-blue"><b>勤務終了時刻</b></label>
              <input
                type="time"
                className="w3-input w3-border"
                value={formData.workEndTime}
                onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>休憩時間（分）</b></label>
            <input
              type="number"
              className="w3-input w3-border"
              value={formData.breakDuration}
              onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
              min="0"
              max="480"
              required
            />
          </div>          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>勤務場所</b></label>
            <input
              type="text"
              className="w3-input w3-border"
              value={formData.workLocation}
              onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              placeholder="例: 本社、リモート、現場"
            />
          </div>

          <div className="w3-margin-bottom">
            <label className="w3-text-blue"><b>週開始日</b></label>
            <select
              className="w3-select w3-border"
              value={formData.weekStartDay}
              onChange={(e) => setFormData({ ...formData, weekStartDay: e.target.value })}
            >
              <option value="SUNDAY">日曜日</option>
              <option value="MONDAY">月曜日</option>
              <option value="TUESDAY">火曜日</option>
              <option value="WEDNESDAY">水曜日</option>
              <option value="THURSDAY">木曜日</option>
              <option value="FRIDAY">金曜日</option>
              <option value="SATURDAY">土曜日</option>
            </select>
          </div>

          <div className="w3-margin-top">
            <button
              type="button"
              className="w3-button w3-grey"
              onClick={onClose}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ユーザー割り当てモーダル
const UserAssignModal = ({ isOpen, onClose, onSave, isLoading, availableUsers, assignedUsers, settingsName }) => {
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const assignedUserIds = assignedUsers.map(assignment => assignment.user.id);
  const unassignedUsers = availableUsers?.filter(user => !assignedUserIds.includes(user.id)) || [];

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(selectedUserIds);
  };

  if (!isOpen) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <span className="w3-button w3-display-topright" onClick={onClose}>×</span>
          <h2>ユーザー割り当て - {settingsName}</h2>
        </header>
        <form onSubmit={handleSubmit} className="w3-container w3-padding">
          <div className="w3-margin-bottom">
            <h4>利用可能なユーザー</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {unassignedUsers.length > 0 ? (
                unassignedUsers.map(user => (
                  <label key={user.id} className="w3-check w3-block w3-padding">
                    <input
                      type="checkbox"
                      className="w3-check"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                    />
                    <span className="w3-checkmark"></span>
                    {user.lastName} {user.firstName} ({user.email})
                  </label>
                ))
              ) : (
                <div className="w3-text-grey w3-center w3-padding">
                  割り当て可能なユーザーがいません
                </div>
              )}
            </div>
          </div>

          <div className="w3-margin-top">
            <button
              type="button"
              className="w3-button w3-grey"
              onClick={onClose}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={isLoading || selectedUserIds.length === 0}
            >
              {isLoading ? '割り当て中...' : `割り当て (${selectedUserIds.length}名)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectWorkSettingsManagement;
