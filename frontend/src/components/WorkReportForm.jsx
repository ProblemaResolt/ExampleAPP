import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { FaSave, FaTimes, FaPlus, FaTrash, FaClock, FaTag, FaFlag, FaClipboardList } from 'react-icons/fa';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from './Snackbar';

const WorkReportForm = ({ timeEntryId, initialData, onSave, onCancel }) => {
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [workReport, setWorkReport] = useState({
    timeEntryId: timeEntryId || '',
    projectId: '',
    category: 'DEVELOPMENT',
    taskDescription: '',
    hoursWorked: '',
    completionRate: 0,
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    notes: '',
    tags: [],
    workDate: new Date().toISOString().split('T')[0] // 今日の日付をデフォルトに
  });
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 既存のaxiosクライアントを使用したAPI関数
  const attendanceAPI = {
    addWorkReport: (timeEntryId, data) => api.post(`/attendance/work-report/${timeEntryId}`, data),
    updateWorkReport: (reportId, data) => api.put(`/attendance/work-report/${reportId}`, data),
    createWorkReport: (data) => {
      // timeEntryIdはworkReportに含まれている前提
      return api.post(`/attendance/work-report/${data.timeEntryId}`, data);
    }
  };
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (initialData) {
      setWorkReport({
        ...initialData,
        tags: initialData.tags || []
      });
    }
    fetchProjects();
  }, [initialData]);

  const fetchProjects = async () => {
    try {
      // プロジェクトAPIがある場合は取得
      // const response = await projectAPI.getProjects();
      // setProjects(response.data);
      
      // 仮のプロジェクトデータ
      setProjects([
        { id: 1, name: 'プロジェクトA' },
        { id: 2, name: 'プロジェクトB' },
        { id: 3, name: '内部業務' }
      ]);
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
    }
  };

  const categories = [
    { value: 'DEVELOPMENT', label: '開発' },
    { value: 'DESIGN', label: 'デザイン' },
    { value: 'TESTING', label: 'テスト' },
    { value: 'DOCUMENTATION', label: 'ドキュメント作成' },
    { value: 'MEETING', label: 'ミーティング' },
    { value: 'PLANNING', label: '企画・計画' },
    { value: 'REVIEW', label: 'レビュー' },
    { value: 'MAINTENANCE', label: 'メンテナンス' },
    { value: 'SUPPORT', label: 'サポート' },
    { value: 'OTHER', label: 'その他' }
  ];

  const priorities = [
    { value: 'LOW', label: '低', color: 'w3-green' },
    { value: 'MEDIUM', label: '中', color: 'w3-yellow' },
    { value: 'HIGH', label: '高', color: 'w3-orange' },
    { value: 'URGENT', label: '緊急', color: 'w3-red' }
  ];

  const statuses = [
    { value: 'NOT_STARTED', label: '未着手' },
    { value: 'IN_PROGRESS', label: '進行中' },
    { value: 'COMPLETED', label: '完了' },
    { value: 'ON_HOLD', label: '保留' },
    { value: 'CANCELLED', label: 'キャンセル' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!workReport.taskDescription.trim()) {
      newErrors.taskDescription = 'タスク内容は必須です';
    }
    
    if (!workReport.hoursWorked || workReport.hoursWorked <= 0) {
      newErrors.hoursWorked = '作業時間は0より大きい値を入力してください';
    }
    
    if (workReport.completionRate < 0 || workReport.completionRate > 100) {
      newErrors.completionRate = '進捗率は0-100の範囲で入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      // timeEntryIdが必ずセットされているかチェック
      const effectiveTimeEntryId = workReport.timeEntryId || timeEntryId;
      if (!effectiveTimeEntryId) {
        showError('勤怠レコード(timeEntryId)がありません。保存できません。');
        setLoading(false);
        return;
      }
      // 既存リポートがあるか確認（timeEntryId, descriptionで検索）
      const checkRes = await api.get('/attendance/work-reports', {
        params: {
          timeEntryId: effectiveTimeEntryId,
          limit: 1
        }
      });
      const existing = checkRes.data?.data?.workReports?.find(
        r => r.description === workReport.taskDescription
      );
      // Prisma/バリデーション仕様に合わせて送信データを整形
      const payload = {
        timeEntryId: effectiveTimeEntryId,
        projectId: workReport.projectId || undefined,
        description: workReport.taskDescription,
        workHours: parseFloat(workReport.hoursWorked),
        category: workReport.category,
        status: workReport.status,
        priority: workReport.priority,
        tasks: workReport.tags && workReport.tags.length > 0 ? workReport.tags : undefined,
        notes: workReport.notes || undefined
      };
      let response;
      if (existing) {
        response = await attendanceAPI.updateWorkReport(existing.id, payload);
      } else {
        response = await attendanceAPI.createWorkReport(payload);
      }
      if (onSave) onSave(response.data);
    } catch (error) {
      console.error('業務レポート保存エラー:', error);
      showError('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setWorkReport(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !workReport.tags.includes(tagInput.trim())) {
      setWorkReport(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setWorkReport(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="w3-card w3-white">
      <header className="w3-container w3-blue">
        <h3>
          <FaClipboardList className="w3-margin-right" />
          {workReport.id ? '業務レポート編集' : '業務レポート作成'}
        </h3>
      </header>
        <form onSubmit={handleSubmit} className="w3-container w3-padding">
        {/* 作業日選択 */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>作業日:</strong>
          </label>
          <input
            type="date"
            className="w3-input w3-border w3-margin-top"
            value={workReport.workDate}
            onChange={(e) => handleInputChange('workDate', e.target.value)}
          />
        </div>

        {/* プロジェクト選択 */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>プロジェクト:</strong>
          </label>
          <select
            className="w3-select w3-border w3-margin-top"
            value={workReport.projectId}
            onChange={(e) => handleInputChange('projectId', e.target.value)}
          >
            <option value="">プロジェクトを選択</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* カテゴリー選択 */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>カテゴリー:</strong>
          </label>
          <select
            className="w3-select w3-border w3-margin-top"
            value={workReport.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* タスク内容 */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>タスク内容 *:</strong>
          </label>
          <textarea
            className={`w3-input w3-border w3-margin-top ${errors.taskDescription ? 'w3-border-red' : ''}`}
            value={workReport.taskDescription}
            onChange={(e) => handleInputChange('taskDescription', e.target.value)}
            placeholder="実施したタスクの詳細を入力してください"
            rows="3"
          />
          {errors.taskDescription && (
            <p className="w3-text-red w3-small">{errors.taskDescription}</p>
          )}
        </div>

        {/* 作業時間と進捗率 */}
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col s6 w3-padding-right">
            <label className="w3-text-grey">
              <strong>
                <FaClock className="w3-margin-right" />
                作業時間 (時間) *:
              </strong>
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              className={`w3-input w3-border w3-margin-top ${errors.hoursWorked ? 'w3-border-red' : ''}`}
              value={workReport.hoursWorked}
              onChange={(e) => handleInputChange('hoursWorked', parseFloat(e.target.value) || '')}
              placeholder="例: 2.5"
            />
            {errors.hoursWorked && (
              <p className="w3-text-red w3-small">{errors.hoursWorked}</p>
            )}
          </div>
          
          <div className="w3-col s6 w3-padding-left">
            <label className="w3-text-grey">
              <strong>進捗率 (%):</strong>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className={`w3-input w3-border w3-margin-top ${errors.completionRate ? 'w3-border-red' : ''}`}
              value={workReport.completionRate}
              onChange={(e) => handleInputChange('completionRate', parseInt(e.target.value) || 0)}
              placeholder="0-100"
            />
            {errors.completionRate && (
              <p className="w3-text-red w3-small">{errors.completionRate}</p>
            )}
          </div>
        </div>

        {/* 優先度とステータス */}
        <div className="w3-row w3-margin-bottom">
          <div className="w3-col s6 w3-padding-right">
            <label className="w3-text-grey">
              <strong>
                <FaFlag className="w3-margin-right" />
                優先度:
              </strong>
            </label>
            <select
              className="w3-select w3-border w3-margin-top"
              value={workReport.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w3-col s6 w3-padding-left">
            <label className="w3-text-grey">
              <strong>ステータス:</strong>
            </label>
            <select
              className="w3-select w3-border w3-margin-top"
              value={workReport.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* タグ */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>
              <FaTag className="w3-margin-right" />
              タグ:
            </strong>
          </label>
          <div className="w3-row w3-margin-top">
            <div className="w3-col s10">
              <input
                type="text"
                className="w3-input w3-border"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="タグを入力してEnterキーで追加"
              />
            </div>
            <div className="w3-col s2">
              <button
                type="button"
                className="w3-button w3-blue w3-block"
                onClick={addTag}
              >
                <FaPlus />
              </button>
            </div>
          </div>
          
          {workReport.tags.length > 0 && (
            <div className="w3-margin-top">
              {workReport.tags.map((tag, index) => (
                <span key={index} className="w3-tag w3-blue w3-margin-right w3-margin-bottom">
                  {tag}
                  <button
                    type="button"
                    className="w3-button w3-small w3-red"
                    onClick={() => removeTag(tag)}
                    style={{ marginLeft: '5px', padding: '1px 5px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 備考 */}
        <div className="w3-margin-bottom">
          <label className="w3-text-grey">
            <strong>備考・詳細:</strong>
          </label>
          <textarea
            className="w3-input w3-border w3-margin-top"
            value={workReport.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="追加の詳細や備考があれば入力してください"
            rows="3"
          />
        </div>

        {/* フォームボタン */}
        <div className="w3-margin-top w3-margin-bottom">
          <button
            type="submit"
            className="w3-button w3-blue w3-margin-right"
            disabled={loading}
          >
            <FaSave className="w3-margin-right" />
            {loading ? '保存中...' : '保存'}
          </button>
          
          <button
            type="button"
            className="w3-button w3-light-grey"
            onClick={onCancel}
            disabled={loading}
          >
            <FaTimes className="w3-margin-right" />
            キャンセル
          </button>
        </div>
      </form>
      
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default WorkReportForm;
