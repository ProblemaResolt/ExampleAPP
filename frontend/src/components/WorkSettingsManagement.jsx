import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCog, FaUsers, FaUser, FaSave, FaTimes, FaEdit, FaCheck } from 'react-icons/fa';
import api from '../utils/axios';

const WorkSettingsManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);  const [bulkSettings, setBulkSettings] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    breakTime: 60,
    overtimeThreshold: 0,
    interval15Minutes: true,
    interval30Minutes: false
  });
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // 勤務時間を自動計算するヘルパー関数
  const calculateWorkHours = (startTime, endTime, breakTime) => {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    const totalWorkMinutes = endTotalMinutes - startTotalMinutes - breakTime;
    return Math.max(0, totalWorkMinutes / 60);
  };

  // 時間選択肢を生成するヘルパー関数
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  // 休憩時間選択肢を生成（15分刻み）
  const generateBreakTimeOptions = () => {
    const options = [];
    for (let minutes = 0; minutes <= 480; minutes += 15) {
      options.push(minutes);
    }
    return options;
  };  // 残業閾値選択肢を生成（0.5時間刻み、0〜45時間）
  const generateOvertimeOptions = () => {
    const options = [];
    for (let hours = 0; hours <= 45; hours += 0.5) {
      options.push(hours);
    }
    return options;
  };

  // ユーザー一覧と勤務設定を取得
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users-work-settings', currentPage, searchTerm],
    queryFn: async () => {
      const { data } = await api.get('/attendance/admin/users-work-settings', {
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
      const { data } = await api.put(`/attendance/admin/user-work-settings/${userId}`, settings);
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
      const { data } = await api.put('/attendance/admin/bulk-work-settings', settings);
      return data;
    },onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-work-settings'] });
      setSuccess(data.message);
      setError('');
      setSelectedUsers([]);      setBulkSettings({
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakTime: 60,
        overtimeThreshold: 0,
        interval15Minutes: true,
        interval30Minutes: false
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
  };  // 一括設定保存
  const handleBulkUpdate = () => {
    if (selectedUsers.length === 0) {
      setError('更新対象のユーザーを選択してください');
      return;
    }

    // 勤務時間を自動計算して含める
    const calculatedWorkHours = calculateWorkHours(
      bulkSettings.workStartTime, 
      bulkSettings.workEndTime, 
      bulkSettings.breakTime
    );

    // 時間間隔を数値に変換
    const timeInterval = bulkSettings.interval15Minutes ? 15 : 30;

    const settingsToSend = {
      userIds: selectedUsers,
      workHours: calculatedWorkHours,
      workStartTime: bulkSettings.workStartTime,
      workEndTime: bulkSettings.workEndTime,
      breakTime: bulkSettings.breakTime,
      overtimeThreshold: Math.floor(bulkSettings.overtimeThreshold), // 整数に変換
      timeInterval: timeInterval
    };

    // 空の値やundefinedを除去
    const filteredSettings = Object.fromEntries(
      Object.entries(settingsToSend).filter(([key, value]) => {
        if (key === 'userIds') return true; // userIdsは必須
        return value !== '' && value !== null && value !== undefined;
      })
    );


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
              </header>              <div className="w3-container w3-padding">
                <div className="w3-row-padding">
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>勤務時間（自動計算）</label>
                    <div className="w3-input w3-border w3-round w3-light-grey" style={{ padding: '8px 16px', backgroundColor: '#f1f1f1' }}>
                      {calculateWorkHours(bulkSettings.workStartTime, bulkSettings.workEndTime, bulkSettings.breakTime).toFixed(1)}時間
                    </div>
                    <p className="w3-text-grey w3-tiny">開始時間 - 終了時間 - 休憩時間で自動計算</p>
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>開始時間</label>
                    <select
                      className="w3-select w3-border w3-round"
                      value={bulkSettings.workStartTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workStartTime: e.target.value }))}
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>終了時間</label>
                    <select
                      className="w3-select w3-border w3-round"
                      value={bulkSettings.workEndTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, workEndTime: e.target.value }))}
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>休憩時間（分）</label>
                    <select
                      className="w3-select w3-border w3-round"
                      value={bulkSettings.breakTime}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) }))}
                    >
                      {generateBreakTimeOptions().map(minutes => (
                        <option key={minutes} value={minutes}>
                          {minutes === 0 ? '0分' : `${minutes}分`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="w3-row-padding">
                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>残業基準（時間）</label>
                    <select
                      className="w3-select w3-border w3-round"
                      value={bulkSettings.overtimeThreshold}
                      onChange={(e) => setBulkSettings(prev => ({ ...prev, overtimeThreshold: parseFloat(e.target.value) }))}
                    >
                      {generateOvertimeOptions().map(hours => (
                        <option key={hours} value={hours}>
                          {hours === 0 ? '0時間' : `${hours}時間`}
                        </option>
                      ))}
                    </select>
                  </div>                  <div className="w3-col l3 m6 s12 w3-margin-bottom">
                    <label>時間間隔</label>
                    <div style={{ paddingTop: '8px' }}>
                      <input
                        type="radio"
                        id="interval15"
                        name="timeInterval"
                        checked={bulkSettings.interval15Minutes}
                        onChange={() => setBulkSettings(prev => ({ 
                          ...prev, 
                          interval15Minutes: true,
                          interval30Minutes: false
                        }))}
                        className="w3-radio"
                      />
                      <label htmlFor="interval15" className="w3-margin-left w3-margin-right">15分</label>
                      
                      <input
                        type="radio"
                        id="interval30"
                        name="timeInterval"
                        checked={bulkSettings.interval30Minutes}
                        onChange={() => setBulkSettings(prev => ({ 
                          ...prev, 
                          interval15Minutes: false,
                          interval30Minutes: true
                        }))}
                        className="w3-radio"
                      />
                      <label htmlFor="interval30" className="w3-margin-left">30分</label>
                    </div>
                  </div>
                  <div className="w3-col l6 m12 s12 w3-margin-bottom">
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
      <td>        {isEditing ? (
          <input
            type="number"
            min="0"
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
