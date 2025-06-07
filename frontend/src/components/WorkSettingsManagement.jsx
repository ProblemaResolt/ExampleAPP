import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCog, FaUsers, FaUser, FaSave, FaTimes, FaEdit, FaCheck } from 'react-icons/fa';
import api from '../utils/axios';

const WorkSettingsManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkSettings, setBulkSettings] = useState({
    workHours: '',
    workStartTime: '',
    workEndTime: '',
    breakTime: '',
    overtimeThreshold: '',
    transportationCost: '',
    timeInterval: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // ユーザー一覧と勤務設定を取得
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users-work-settings', currentPage, searchTerm],
    queryFn: async () => {
      const { data } = await api.get('/api/attendance/admin/users-work-settings', {
        params: {
          page: currentPage,
          limit: 20,
          search: searchTerm
        }
      });
      return data;
    }
  });

  // 個別設定更新
  const updateUserSettings = useMutation({
    mutationFn: async ({ userId, settings }) => {
      const { data } = await api.put(`/api/attendance/admin/user-work-settings/${userId}`, settings);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-work-settings'] });
      setSuccess(data.message);
      setError('');
      setEditingUser(null);
    },
    onError: (error) => {
      setError(error.response?.data?.message || '設定の更新に失敗しました');
      setSuccess('');
    }
  });

  // 一括設定更新
  const bulkUpdateSettings = useMutation({
    mutationFn: async (settings) => {
      const { data } = await api.put('/api/attendance/admin/bulk-work-settings', {
        userIds: selectedUsers,
        ...settings
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-work-settings'] });
      setSuccess(data.message);
      setError('');
      setSelectedUsers([]);
      setBulkSettings({
        workHours: '',
        workStartTime: '',
        workEndTime: '',
        breakTime: '',
        overtimeThreshold: '',
        transportationCost: '',
        timeInterval: ''
      });
    },
    onError: (error) => {
      setError(error.response?.data?.message || '一括更新に失敗しました');
      setSuccess('');
    }
  });

  // 検索実行
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // ユーザー選択の切り替え
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedUsers.length === usersData?.data?.users?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersData?.data?.users?.map(user => user.id) || []);
    }
  };

  // 個別設定保存
  const handleSaveUserSettings = (userId, settings) => {
    updateUserSettings.mutate({ userId, settings });
  };

  // 一括設定保存
  const handleBulkUpdate = () => {
    if (selectedUsers.length === 0) {
      setError('更新対象のユーザーを選択してください');
      return;
    }

    // 空の値を除去
    const filteredSettings = Object.fromEntries(
      Object.entries(bulkSettings).filter(([_, value]) => value !== '')
    );

    if (Object.keys(filteredSettings).length === 0) {
      setError('更新する設定項目を入力してください');
      return;
    }

    bulkUpdateSettings.mutate(filteredSettings);
  };

  // エラー・成功メッセージのクリア
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (isLoading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <i className="fa fa-spinner fa-spin w3-large"></i>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w3-container w3-margin-top">
      <div className="w3-card w3-white">
        <header className="w3-container w3-blue">
          <h3>
            <FaCog className="w3-margin-right" />
            勤務設定管理
          </h3>
        </header>

        <div className="w3-container w3-padding">
          {/* 成功・エラーメッセージ */}
          {success && (
            <div className="w3-panel w3-green w3-round w3-margin-bottom">
              <p><FaCheck className="w3-margin-right" />{success}</p>
            </div>
          )}
          {error && (
            <div className="w3-panel w3-red w3-round w3-margin-bottom">
              <p><FaTimes className="w3-margin-right" />{error}</p>
            </div>
          )}

          {/* 検索フォーム */}
          <form onSubmit={handleSearch} className="w3-margin-bottom">
            <div className="w3-row-padding">
              <div className="w3-col l8 m8 s12">
                <input
                  type="text"
                  className="w3-input w3-border w3-round"
                  placeholder="ユーザー名、メールアドレスで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w3-col l4 m4 s12">
                <button type="submit" className="w3-button w3-blue w3-round w3-block">
                  検索
                </button>
              </div>
            </div>
          </form>

          {/* 一括設定フォーム */}
          {selectedUsers.length > 0 && (
            <div className="w3-card w3-light-grey w3-margin-bottom">
              <header className="w3-container w3-orange">
                <h5>
                  <FaUsers className="w3-margin-right" />
                  一括設定 ({selectedUsers.length}名選択中)
                </h5>
              </header>
              <div className="w3-container w3-padding">
                <div className="w3-row-padding">
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>勤務時間</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      className="w3-input w3-border w3-round"
                      placeholder="8.0"
                      value={bulkSettings.workHours}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workHours: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>開始時間</label>
                    <input
                      type="time"
                      className="w3-input w3-border w3-round"
                      value={bulkSettings.workStartTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workStartTime: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>終了時間</label>
                    <input
                      type="time"
                      className="w3-input w3-border w3-round"
                      value={bulkSettings.workEndTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workEndTime: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>休憩時間（分）</label>
                    <input
                      type="number"
                      min="0"
                      max="480"
                      className="w3-input w3-border w3-round"
                      placeholder="60"
                      value={bulkSettings.breakTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, breakTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="w3-row-padding">
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>残業基準（時間）</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      className="w3-input w3-border w3-round"
                      placeholder="8"
                      value={bulkSettings.overtimeThreshold}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, overtimeThreshold: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>交通費（円）</label>
                    <input
                      type="number"
                      min="0"
                      className="w3-input w3-border w3-round"
                      placeholder="0"
                      value={bulkSettings.transportationCost}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, transportationCost: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>時間間隔（分）</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      className="w3-input w3-border w3-round"
                      placeholder="15"
                      value={bulkSettings.timeInterval}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, timeInterval: e.target.value }))}
                    />
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>&nbsp;</label>
                    <button
                      onClick={handleBulkUpdate}
                      className="w3-button w3-green w3-round w3-block"
                      disabled={bulkUpdateSettings.isPending}
                    >
                      <FaSave className="w3-margin-right" />
                      一括更新
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ユーザー一覧テーブル */}
          <div className="w3-responsive">
            <table className="w3-table-all w3-hoverable">
              <thead>
                <tr className="w3-blue">
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === usersData?.data?.users?.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>ユーザー名</th>
                  <th>メール</th>
                  <th>会社</th>
                  <th>勤務時間</th>
                  <th>開始時間</th>
                  <th>終了時間</th>
                  <th>休憩時間</th>
                  <th>残業基準</th>
                  <th>交通費</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.data?.users?.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelected={selectedUsers.includes(user.id)}
                    onToggleSelect={() => toggleUserSelection(user.id)}
                    isEditing={editingUser === user.id}
                    onStartEdit={() => setEditingUser(user.id)}
                    onCancelEdit={() => setEditingUser(null)}
                    onSave={(settings) => handleSaveUserSettings(user.id, settings)}
                    isUpdating={updateUserSettings.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {usersData?.data?.pagination && (
            <div className="w3-center w3-margin-top">
              <div className="w3-bar">
                {Array.from({ length: usersData.data.pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`w3-bar-item w3-button ${page === currentPage ? 'w3-blue' : 'w3-white'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <p className="w3-text-grey">
                全 {usersData.data.pagination.total} 件中 {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, usersData.data.pagination.total)} 件
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ユーザー行コンポーネント
const UserRow = ({ user, isSelected, onToggleSelect, isEditing, onStartEdit, onCancelEdit, onSave, isUpdating }) => {
  const [editSettings, setEditSettings] = useState({
    workHours: user.workSettings.workHours,
    workStartTime: user.workSettings.workStartTime,
    workEndTime: user.workSettings.workEndTime,
    breakTime: user.workSettings.breakTime,
    overtimeThreshold: user.workSettings.overtimeThreshold,
    transportationCost: user.workSettings.transportationCost,
    timeInterval: user.workSettings.timeInterval
  });

  const handleSave = () => {
    onSave(editSettings);
  };

  const handleCancel = () => {
    setEditSettings({
      workHours: user.workSettings.workHours,
      workStartTime: user.workSettings.workStartTime,
      workEndTime: user.workSettings.workEndTime,
      breakTime: user.workSettings.breakTime,
      overtimeThreshold: user.workSettings.overtimeThreshold,
      transportationCost: user.workSettings.transportationCost,
      timeInterval: user.workSettings.timeInterval
    });
    onCancelEdit();
  };

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
        />
      </td>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.company}</td>
      <td>
        {isEditing ? (
          <input
            type="number"
            step="0.5"
            min="1"
            max="24"
            className="w3-input w3-border"
            value={editSettings.workHours}
            onChange={(e) => setEditSettings(prev => ({ ...prev, workHours: parseFloat(e.target.value) }))}
          />
        ) : (
          `${user.workSettings.workHours}時間`
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="time"
            className="w3-input w3-border"
            value={editSettings.workStartTime}
            onChange={(e) => setEditSettings(prev => ({ ...prev, workStartTime: e.target.value }))}
          />
        ) : (
          user.workSettings.workStartTime
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="time"
            className="w3-input w3-border"
            value={editSettings.workEndTime}
            onChange={(e) => setEditSettings(prev => ({ ...prev, workEndTime: e.target.value }))}
          />
        ) : (
          user.workSettings.workEndTime
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            min="0"
            max="480"
            className="w3-input w3-border"
            value={editSettings.breakTime}
            onChange={(e) => setEditSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) }))}
          />
        ) : (
          `${user.workSettings.breakTime}分`
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            min="1"
            max="24"
            className="w3-input w3-border"
            value={editSettings.overtimeThreshold}
            onChange={(e) => setEditSettings(prev => ({ ...prev, overtimeThreshold: parseInt(e.target.value) }))}
          />
        ) : (
          `${user.workSettings.overtimeThreshold}時間`
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            min="0"
            className="w3-input w3-border"
            value={editSettings.transportationCost}
            onChange={(e) => setEditSettings(prev => ({ ...prev, transportationCost: parseInt(e.target.value) }))}
          />
        ) : (
          `¥${user.workSettings.transportationCost}`
        )}
      </td>
      <td>
        {isEditing ? (
          <div>
            <button
              className="w3-button w3-green w3-small w3-margin-right"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <FaSave />
            </button>
            <button
              className="w3-button w3-light-grey w3-small"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <button
            className="w3-button w3-blue w3-small"
            onClick={onStartEdit}
          >
            <FaEdit />
          </button>
        )}
      </td>
    </tr>
  );
};

export default WorkSettingsManagement;
