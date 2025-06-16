import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaClock, FaUsers, FaEdit, FaPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const WorkScheduleManagement = ({ userRole, companyId }) => {
  const [schedules, setSchedules] = useState([]);
  const [userSchedules, setUserSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const { snackbar, showError, showSuccess, hideSnackbar } = useSnackbar();
  
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    breakDuration: 60,
    workDays: [1, 2, 3, 4, 5], // 月-金
    isDefault: false
  });

  // 既存のaxiosクライアントを使用したAPI関数
  const workScheduleAPI = {
    getSchedules: (params) => api.get('/work-schedule/work-schedules', { params }),
    createSchedule: (data) => api.post('/work-schedule/work-schedule', data),
    updateSchedule: (scheduleId, data) => api.put(`/work-schedule/work-schedule/${scheduleId}`, data),
    deleteSchedule: (scheduleId) => api.delete(`/work-schedule/work-schedule/${scheduleId}`),    getUserSchedules: (params) => api.get('/work-schedule/user-work-schedules', { params }),
    assignUserSchedule: (data) => api.post('/work-schedule/user-work-schedule', data),
    updateUserWorkSchedule: (userScheduleId, data) => api.put(`/work-schedule/user-work-schedule/${userScheduleId}`, data),
    deleteUserWorkSchedule: (userScheduleId) => api.delete(`/work-schedule/user-work-schedule/${userScheduleId}`),
  };

  const weekDays = [
    { value: 0, label: '日曜日' },
    { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' },
    { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' },
    { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWorkSchedules(),
        fetchUserSchedules()
      ]);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkSchedules = async () => {
    try {
      const response = await workScheduleAPI.getSchedules();
      setSchedules(response.data);
    } catch (error) {
      console.error('勤務スケジュール取得エラー:', error);
    }
  };

  const fetchUserSchedules = async () => {
    try {
      const response = await workScheduleAPI.getUserSchedules();
      setUserSchedules(response.data);
    } catch (error) {
      console.error('ユーザースケジュール取得エラー:', error);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    
    if (!newSchedule.name.trim()) {
      showError('スケジュール名は必須です');
      return;
    }
    
    try {
      await workScheduleAPI.createSchedule({
        ...newSchedule,
        companyId
      });
      
      setNewSchedule({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        workDays: [1, 2, 3, 4, 5],
        isDefault: false
      });
      setShowCreateForm(false);
      await fetchWorkSchedules();
      showSuccess('スケジュールを作成しました');
    } catch (error) {
      console.error('スケジュール作成エラー:', error);
      showError('作成に失敗しました');
    }
  };

  const handleUpdateSchedule = async (scheduleId, updateData) => {
    try {
      await workScheduleAPI.updateSchedule(scheduleId, updateData);
      await fetchWorkSchedules();
      setEditingSchedule(null);
      showSuccess('スケジュールを更新しました');
    } catch (error) {
      console.error('スケジュール更新エラー:', error);
      showError('更新に失敗しました');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await workScheduleAPI.deleteSchedule(scheduleId);
      await fetchWorkSchedules();
      showSuccess('スケジュールを削除しました');
    } catch (error) {
      console.error('スケジュール削除エラー:', error);
      showError('削除に失敗しました');
    }
  };

  const handleAssignSchedule = async (userId, scheduleId, startDate) => {
    try {
      await workScheduleAPI.assignUserSchedule({
        userId,
        scheduleId,
        startDate
      });
      await fetchUserSchedules();
      showSuccess('スケジュールを割り当てました');
    } catch (error) {
      console.error('スケジュール割り当てエラー:', error);
      showError('割り当てに失敗しました');
    }
  };

  const calculateWorkHours = (startTime, endTime, breakDuration) => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const workMinutes = (end - start) / (1000 * 60) - breakDuration;
    return (workMinutes / 60).toFixed(1);
  };

  const formatWorkDays = (workDays) => {
    return workDays.map(day => weekDays.find(wd => wd.value === day)?.label.substring(0, 1)).join('');
  };

  const handleWorkDayToggle = (dayValue, isScheduleEdit = false) => {
    const targetSchedule = isScheduleEdit ? editingSchedule : newSchedule;
    const setter = isScheduleEdit ? setEditingSchedule : setNewSchedule;
    
    setter(prev => ({
      ...prev,
      workDays: prev.workDays.includes(dayValue)
        ? prev.workDays.filter(day => day !== dayValue)
        : [...prev.workDays, dayValue].sort()
    }));
  };

  if (loading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <i className="fa fa-spinner fa-spin fa-3x"></i>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w3-container">
      <h2>
        <FaClock className="w3-margin-right" />
        勤務スケジュール管理
      </h2>

      {/* 管理者向け：スケジュール作成 */}
      {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
        <div className="w3-margin-bottom">
          {!showCreateForm ? (
            <button
              className="w3-button w3-blue"
              onClick={() => setShowCreateForm(true)}
            >
              <FaPlus className="w3-margin-right" />
              新しいスケジュール作成
            </button>
          ) : (
            <div className="w3-card w3-white w3-margin-bottom">
              <header className="w3-container w3-blue">
                <h4>新しいスケジュール作成</h4>
              </header>
              <form onSubmit={handleCreateSchedule} className="w3-container w3-padding">
                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>スケジュール名:</strong></label>
                    <input
                      type="text"
                      className="w3-input w3-border w3-margin-top"
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="例: 通常勤務"
                      required
                    />
                  </div>
                  
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>休憩時間 (分):</strong></label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      step="15"
                      className="w3-input w3-border w3-margin-top"
                      value={newSchedule.breakDuration}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="w3-row w3-margin-bottom">
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>開始時刻:</strong></label>
                    <input
                      type="time"
                      className="w3-input w3-border w3-margin-top"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  
                  <div className="w3-col s12 m6">
                    <label className="w3-text-grey"><strong>終了時刻:</strong></label>
                    <input
                      type="time"
                      className="w3-input w3-border w3-margin-top"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="w3-margin-bottom">
                  <label className="w3-text-grey"><strong>勤務曜日:</strong></label>
                  <div className="w3-margin-top">
                    {weekDays.map(day => (
                      <label key={day.value} className="w3-margin-right">
                        <input
                          type="checkbox"
                          className="w3-check w3-margin-right"
                          checked={newSchedule.workDays.includes(day.value)}
                          onChange={() => handleWorkDayToggle(day.value)}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="w3-margin-bottom">
                  <label>
                    <input
                      type="checkbox"
                      className="w3-check w3-margin-right"
                      checked={newSchedule.isDefault}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, isDefault: e.target.checked }))}
                    />
                    デフォルトスケジュールとして設定
                  </label>
                </div>

                <div className="w3-panel w3-pale-blue w3-border-blue">
                  <p><strong>予想勤務時間: {calculateWorkHours(newSchedule.startTime, newSchedule.endTime, newSchedule.breakDuration)}時間/日</strong></p>
                </div>

                <div className="w3-margin-top">
                  <button type="submit" className="w3-button w3-blue w3-margin-right">
                    <FaSave className="w3-margin-right" />
                    作成
                  </button>
                  <button
                    type="button"
                    className="w3-button w3-light-grey"
                    onClick={() => setShowCreateForm(false)}
                  >
                    <FaTimes className="w3-margin-right" />
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* スケジュール一覧 */}
      <div className="w3-card w3-white w3-margin-bottom">
        <header className="w3-container w3-light-grey">
          <h4>勤務スケジュール一覧</h4>
        </header>
        <div className="w3-container w3-padding">
          {schedules.length === 0 ? (
            <p className="w3-center w3-text-grey">スケジュールがありません</p>
          ) : (
            <div className="w3-responsive">
              <table className="w3-table w3-striped w3-bordered">
                <thead>
                  <tr className="w3-light-grey">
                    <th>スケジュール名</th>
                    <th>時間</th>
                    <th>勤務曜日</th>
                    <th>休憩時間</th>
                    <th>勤務時間/日</th>
                    <th>デフォルト</th>
                    {(userRole === 'ADMIN' || userRole === 'MANAGER') && <th>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id ? (
                          <input
                            type="text"
                            className="w3-input w3-border"
                            value={editingSchedule.name}
                            onChange={(e) => setEditingSchedule(prev => ({ ...prev, name: e.target.value }))}
                          />
                        ) : (
                          schedule.name
                        )}
                      </td>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id ? (
                          <div>
                            <input
                              type="time"
                              className="w3-input w3-border w3-margin-bottom"
                              value={editingSchedule.startTime}
                              onChange={(e) => setEditingSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                            <input
                              type="time"
                              className="w3-input w3-border"
                              value={editingSchedule.endTime}
                              onChange={(e) => setEditingSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                          </div>
                        ) : (
                          `${schedule.startTime} - ${schedule.endTime}`
                        )}
                      </td>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id ? (
                          <div>
                            {weekDays.map(day => (
                              <label key={day.value} className="w3-margin-right w3-small">
                                <input
                                  type="checkbox"
                                  className="w3-check"
                                  checked={editingSchedule.workDays.includes(day.value)}
                                  onChange={() => handleWorkDayToggle(day.value, true)}
                                />
                                {day.label.substring(0, 1)}
                              </label>
                            ))}
                          </div>
                        ) : (
                          formatWorkDays(schedule.workDays)
                        )}
                      </td>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id ? (
                          <input
                            type="number"
                            min="0"
                            max="120"
                            step="15"
                            className="w3-input w3-border"
                            value={editingSchedule.breakDuration}
                            onChange={(e) => setEditingSchedule(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
                          />
                        ) : (
                          `${schedule.breakDuration}分`
                        )}
                      </td>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id
                          ? calculateWorkHours(editingSchedule.startTime, editingSchedule.endTime, editingSchedule.breakDuration)
                          : calculateWorkHours(schedule.startTime, schedule.endTime, schedule.breakDuration)
                        }時間
                      </td>
                      <td>
                        {editingSchedule && editingSchedule.id === schedule.id ? (
                          <input
                            type="checkbox"
                            className="w3-check"
                            checked={editingSchedule.isDefault}
                            onChange={(e) => setEditingSchedule(prev => ({ ...prev, isDefault: e.target.checked }))}
                          />
                        ) : (
                          schedule.isDefault ? (
                            <span className="w3-tag w3-green w3-small">デフォルト</span>
                          ) : (
                            <span className="w3-text-grey">-</span>
                          )
                        )}
                      </td>
                      {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                        <td>
                          {editingSchedule && editingSchedule.id === schedule.id ? (
                            <div>
                              <button
                                className="w3-button w3-green w3-small w3-margin-right"
                                onClick={() => handleUpdateSchedule(schedule.id, editingSchedule)}
                              >
                                <FaSave />
                              </button>
                              <button
                                className="w3-button w3-light-grey w3-small"
                                onClick={() => setEditingSchedule(null)}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <button
                                className="w3-button w3-blue w3-small w3-margin-right"
                                onClick={() => setEditingSchedule(schedule)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="w3-button w3-red w3-small"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ユーザー別スケジュール割り当て */}
      {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
        <div className="w3-card w3-white">
          <header className="w3-container w3-orange">
            <h4>
              <FaUsers className="w3-margin-right" />
              ユーザー別スケジュール割り当て
            </h4>
          </header>
          <div className="w3-container w3-padding">
            {userSchedules.length === 0 ? (
              <p className="w3-center w3-text-grey">ユーザースケジュールがありません</p>
            ) : (
              <div className="w3-responsive">
                <table className="w3-table w3-striped w3-bordered">
                  <thead>
                    <tr className="w3-light-grey">
                      <th>ユーザー</th>
                      <th>現在のスケジュール</th>
                      <th>適用開始日</th>
                      <th>勤務時間</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSchedules.map((userSchedule) => (
                      <tr key={userSchedule.id}>
                        <td>{userSchedule.user?.name || '不明なユーザー'}</td>
                        <td>{userSchedule.schedule?.name || '未設定'}</td>
                        <td>{userSchedule.startDate ? new Date(userSchedule.startDate).toLocaleDateString('ja-JP') : '-'}</td>
                        <td>
                          {userSchedule.schedule
                            ? `${calculateWorkHours(userSchedule.schedule.startTime, userSchedule.schedule.endTime, userSchedule.schedule.breakDuration)}時間/日`
                            : '-'
                          }
                        </td>
                        <td>
                          <select
                            className="w3-select w3-border w3-small"
                            onChange={(e) => {
                              if (e.target.value) {
                                const startDate = prompt('適用開始日を入力してください (YYYY-MM-DD):');
                                if (startDate) {
                                  handleAssignSchedule(userSchedule.userId, e.target.value, startDate);
                                }
                              }
                            }}
                          >
                            <option value="">スケジュール変更</option>
                            {schedules.map(schedule => (
                              <option key={schedule.id} value={schedule.id}>
                                {schedule.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default WorkScheduleManagement;
