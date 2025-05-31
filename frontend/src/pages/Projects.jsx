import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert } from '@mui/material';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import '../styles/Projects.css';
import api from '../utils/axios';

// バリデーションスキーマ
const projectSchema = yup.object({
  name: yup.string().required('プロジェクト名は必須です'),
  description: yup.string(),
  startDate: yup.date().required('開始日は必須です'),
  endDate: yup.date()
    .nullable()
    .transform((value, originalValue) => {
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      const date = new Date(originalValue);
      return isNaN(date.getTime()) ? null : date;
    }),
  status: yup.string().required('ステータスは必須です'),
  managerIds: yup.array()
    .of(yup.string())
    .min(1, 'プロジェクトマネージャーは1名以上必要です')
    .required('プロジェクトマネージャーは必須です')
});

// ステータスの表示名マッピング
const statusLabels = {
  ACTIVE: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留中',
  CANCELLED: '中止'
};

// ステータスの色マッピング
const statusColors = {
  ACTIVE: 'w3-green',
  COMPLETED: 'w3-blue',
  ON_HOLD: 'w3-orange',
  CANCELLED: 'w3-red'
};

// メンバー行コンポーネント
const MemberRow = ({ member, project, onEdit, onSelect, selected, onPeriodEdit, isManager }) => {
  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(member);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
    } catch (e) {
      console.error('Date formatting error:', { dateString, error: e.message });
      return '-';
    }
  };

  // メンバー情報の存在確認
  if (!member || !member.id) {
    console.error('Invalid member data:', { member });
    return null;
  }

  return (
    <tr className="w3-hover-light-gray">
      <td>
        <input
          type="checkbox"
          className="w3-check"
          checked={selected || false}
          onChange={handleCheckboxClick}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td>
        <div className="w3-cell-row">
          <i className={`fa fa-${isManager ? 'user-circle' : 'user'} w3-margin-right`}></i>
          {member.firstName} {member.lastName}
        </div>
      </td>
      <td>
        <div className="w3-cell-row">
          <i className="fa fa-briefcase w3-margin-right"></i>
          {member.position || '-'}
        </div>
      </td>
      <td>
        <span className={`w3-tag ${isManager ? 'w3-blue' : 'w3-light-gray'} w3-small`}>
          <i className={`fa fa-${isManager ? 'star' : 'user'} w3-margin-right`}></i>
          {isManager ? 'マネージャー' : 'メンバー'}
        </span>
      </td>
      <td>{formatDate(member.projectMembership?.startDate)}</td>
      <td>{formatDate(member.projectMembership?.endDate)}</td>
      <td>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : '未ログイン'}</td>
      <td>{new Date(member.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="w3-bar">
          {project ? (
            <button
              className="w3-button w3-small w3-blue"
              onClick={(e) => {
                e.stopPropagation();
                onPeriodEdit(member, project);
              }}
              title="メンバー期間編集"
            >
              <i className="fa fa-calendar"></i>
            </button>
          ) : (
            <button
              className="w3-button w3-small w3-blue"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(member);
              }}
              title="メンバー編集"
            >
              <i className="fa fa-edit"></i>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// プロジェクト行コンポーネント
const ProjectRow = ({ project, onEdit, onDelete, onSelect, onPeriodEdit, members, selectedMembers, onAddMembers }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // メンバーとマネージャーを分離
  const projectManagers = project.managers || [];
  const projectMembers = project.members?.filter(m => 
    !projectManagers.some(manager => manager.id === m.id)
  ) || [];

  // デバッグログ
  console.log('Project members debug:', {
    projectId: project.id,
    allMembers: project.members,
    managers: projectManagers,
    regularMembers: projectMembers,
    membersWithDetails: project.members?.map(m => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      role: m.role,
      isManager: m.projectMembership?.isManager,
      membership: m.projectMembership
    }))
  });

  return (
    <>
      <tr>
        <td>
          <button 
            className="w3-button w3-block w3-left-align" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w3-left-align">
              <strong>{project.name || '(名称未設定)'}</strong>
              <br />
              <small className="w3-text-grey">
                マネージャー: {projectManagers.length > 0 
                  ? projectManagers.map(manager => `${manager.firstName} ${manager.lastName}`).join(', ')
                  : '-'}
              </small>
            </div>
          </button>
        </td>
        <td>
          {projectManagers.length > 0
            ? projectManagers.map(manager => `${manager.firstName} ${manager.lastName}`).join(', ')
            : '-'}
        </td>
        <td><span className={`w3-tag ${statusColors[project.status]}`}>{statusLabels[project.status] || project.status}</span></td>
        <td>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</td>
        <td>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</td>
        <td>
          <button
            className="w3-button w3-blue w3-small w3-margin-right"
            onClick={() => onEdit(project)}
          >
            <i className="fa fa-edit"></i>
          </button>
          <button
            className="w3-button w3-red w3-small"
            onClick={() => {
              if (window.confirm('このプロジェクトを削除してもよろしいですか？')) {
                onDelete(project.id);
              }
            }}
          >
            <i className="fa fa-trash"></i>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan="6">
            <div className="w3-container w3-padding">
              <h5>プロジェクトメンバー一覧 (マネージャー: {projectManagers.length || 0}名, メンバー: {projectMembers.length || 0}名)</h5>
              <table className="w3-table w3-bordered">
                <thead>
                  <tr>
                    <th>名前</th>
                    <th>役職</th>
                    <th>役割</th>
                    <th>開始日</th>
                    <th>終了日</th>
                    <th>最終ログイン</th>
                    <th>作成日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {/* マネージャー一覧 */}
                  {projectManagers.map(member => (
                    <tr key={`manager-${member.id}`} className="w3-pale-blue">
                      <td>{member.firstName} {member.lastName}</td>
                      <td>{member.position || '-'}</td>
                      <td>
                        <span className="w3-tag w3-blue">
                          {member.role === 'MANAGER' ? 'プロジェクトマネージャー' : 'マネージャー'}
                        </span>
                      </td>
                      <td>{member.projectMembership?.startDate ? new Date(member.projectMembership.startDate).toLocaleDateString() : '-'}</td>
                      <td>{member.projectMembership?.endDate ? new Date(member.projectMembership.endDate).toLocaleDateString() : '-'}</td>
                      <td>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : '未ログイン'}</td>
                      <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="w3-bar">
                          <button 
                            className="w3-button w3-blue w3-small w3-margin-right" 
                            onClick={() => onPeriodEdit(member.user, project)}
                            title="期間編集"
                          >
                            <i className="fa fa-calendar"></i>
                          </button>
                          <button
                            className="w3-button w3-red w3-small"
                            onClick={() => {
                              if (window.confirm(`${member.user.firstName} ${member.user.lastName}をプロジェクトから削除してもよろしいですか？`)) {
                                onRemoveMember(project.id, member.id);
                              }
                            }}
                            title="メンバー削除"
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* メンバー一覧 */}
                  {project.members?.filter(member => !member.projectMembership?.isManager).map(member => (
                    <tr key={`member-${member.id}`}>
                      <td>{member.firstName} {member.lastName}</td>
                      <td>{member.position || '-'}</td>
                      <td><span className="w3-tag w3-light-gray">メンバー</span></td>
                      <td>{member.projectMembership?.startDate ? new Date(member.projectMembership.startDate).toLocaleDateString() : '-'}</td>
                      <td>{member.projectMembership?.endDate ? new Date(member.projectMembership.endDate).toLocaleDateString() : '-'}</td>
                      <td>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : '未ログイン'}</td>
                      <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="w3-bar">
                          <button 
                            className="w3-button w3-blue w3-small w3-margin-right" 
                            onClick={() => onPeriodEdit(member.user, project)}
                            title="期間編集"
                          >
                            <i className="fa fa-calendar"></i>
                          </button>
                          <button
                            className="w3-button w3-red w3-small"
                            onClick={() => {
                              if (window.confirm(`${member.user.firstName} ${member.user.lastName}をプロジェクトから削除してもよろしいですか？`)) {
                                onRemoveMember(project.id, member.id);
                              }
                            }}
                            title="メンバー削除"
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!project.members || project.members.length === 0) && (
                    <tr>
                      <td colSpan="8" className="w3-center">
                        メンバーがいません。
                        <button 
                          className="w3-button w3-blue w3-small w3-margin-left"
                          onClick={() => onAddMembers(project)}
                        >
                          <i className="fa fa-user-plus"></i> メンバーを追加
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="w3-margin-top">
                <button 
                  className="w3-button w3-blue"
                  onClick={() => onAddMembers(project)}
                >
                  <i className="fa fa-user-plus"></i> メンバーを追加
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// 未所属メンバー表示用のコンポーネント
const UnassignedMembersRow = ({ members, onEdit, onSelect, onPeriodEdit, selectedMembers }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="w3-hover-light-gray">
        <td>
          <div className="w3-cell-row">
            <button
              className="w3-button w3-small"
              onClick={() => setExpanded(!expanded)}
            >
              <i className={`fa fa-chevron-${expanded ? 'up' : 'down'}`}></i>
            </button>
            <div className="w3-cell">
              <div className="w3-large">未所属メンバー</div>
              <div className="w3-small w3-text-gray">
                <div>プロジェクト未所属のメンバー</div>
              </div>
            </div>
          </div>
        </td>
        <td colSpan={4}>
          <span className="w3-tag w3-gray">
            {members.length}名のメンバー
          </span>
        </td>
        <td>
          <div className="w3-bar">
            <button
              className="w3-button w3-small w3-blue"
              onClick={() => onEdit(members[0])}
              title="メンバー編集"
            >
              <i className="fa fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="w3-padding-0">
            <div className="w3-container w3-light-gray w3-padding">
              <h6 className="w3-text-gray">未所属メンバー一覧</h6>
              <div className="w3-responsive">
                <table className="w3-table w3-bordered w3-striped">
                  <thead>
                    <tr>
                      <th></th>
                      <th>名前</th>
                      <th>役職</th>
                      <th>最終ログイン</th>
                      <th>作成日</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        onEdit={onEdit}
                        onSelect={onSelect}
                        onPeriodEdit={onPeriodEdit}
                        selected={selectedMembers.some(m => m.id === member.id)}
                        isManager={false}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// メンバー選択コンポーネント
const MemberSelector = ({ selectedMembers, onMemberSelect, disabled }) => {
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          limit: 1000,
          include: ['projectMemberships', 'company']
        }
      });
      return response.data.data.users;
    }
  });

  const availableMembers = useMemo(() => {
    if (!membersData) return [];
    return membersData.filter(member => 
      !selectedMembers.some(selected => selected.id === member.id)
    );
  }, [membersData, selectedMembers]);

  if (isLoading) {
    return <div className="w3-padding w3-center">読み込み中...</div>;
  }

  return (
    <div className="w3-container">
      <div className="w3-row">
        <div className="w3-col m12">
          <div className="w3-margin-bottom">
            <label>選択済みメンバー：</label>
            <div className="w3-padding">
              {selectedMembers.length > 0 ? (
                selectedMembers.map(member => (
                  <div key={member.id} className="w3-bar w3-light-grey w3-margin-bottom">
                    <div className="w3-bar-item">
                      {member.firstName} {member.lastName}
                      {member.company && <span className="w3-text-gray"> - {member.company.name}</span>}
                    </div>
                    <button
                      className="w3-bar-item w3-button w3-right w3-red"
                      onClick={() => {
                        const newSelected = selectedMembers.filter(m => m.id !== member.id);
                        onMemberSelect(newSelected);
                      }}
                      disabled={disabled}
                    >
                      <i className="fa fa-times"></i>
                    </button>
                  </div>
                ))
              ) : (
                <div className="w3-text-grey">メンバーが選択されていません</div>
              )}
            </div>
          </div>
          
          <div className="w3-margin-bottom">
            <label>利用可能なメンバー：</label>
            <div className="w3-padding" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {availableMembers.length > 0 ? (
                availableMembers.map(member => (
                  <div key={member.id} className="w3-bar w3-hover-light-grey w3-margin-bottom">
                    <div className="w3-bar-item">
                      {member.firstName} {member.lastName}
                      {member.company && <span className="w3-text-gray"> - {member.company.name}</span>}
                    </div>
                    <button
                      className="w3-bar-item w3-button w3-right w3-blue"
                      onClick={() => onMemberSelect([...selectedMembers, member])}
                      disabled={disabled}
                    >
                      <i className="fa fa-plus"></i>
                    </button>
                  </div>
                ))
              ) : (
                <div className="w3-text-grey">追加可能なメンバーがいません</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddMemberToProjectDialog = ({ project, open, onClose, onAddMembers }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 重複チェック
      const existingMemberIds = new Set([
        ...(project.members?.map(m => m.id) || []),
        ...(project.managers?.map(m => m.id) || [])
      ]);
      const duplicates = selectedMembers.filter(member => existingMemberIds.has(member.id));

      if (duplicates.length > 0) {
        setError(`以下のメンバーは既にプロジェクトに所属しています: ${duplicates.map(m => `${m.firstName} ${m.lastName}`).join(', ')}`);
        return;
      }

      await onAddMembers(project.id, selectedMembers);
      onClose();
    } catch (err) {
      setError(err.message || 'メンバーの追加中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>メンバーの追加</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <MemberSelector
          selectedMembers={selectedMembers}
          onMemberSelect={setSelectedMembers}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedMembers.length === 0}
        >
          {loading ? '追加中...' : '追加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// メンバー割り当てダイアログ
const AssignMemberDialog = ({ open, onClose, selectedMembers, projects, onAssign }) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [error, setError] = useState('');

  const handleAssign = () => {
    if (!selectedProjectId) {
      setError('プロジェクトを選択してください');
      return;
    }
    onAssign(selectedMembers, selectedProjectId);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '500px' }}>
        <header className="w3-container w3-blue">
          <h3>メンバーの割り当て</h3>
        </header>
        <div className="w3-container">
          <p>選択されたメンバー: {selectedMembers.length}名</p>
          {error && (
            <div className="w3-panel w3-red">
              <p>{error}</p>
            </div>
          )}
          <select
            className="w3-select w3-border"
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setError('');
            }}
          >
            <option value="">プロジェクトを選択してください</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <footer className="w3-container w3-padding">
          <button className="w3-button w3-gray" onClick={onClose}>キャンセル</button>
          <button 
            className="w3-button w3-blue w3-right" 
            onClick={handleAssign}
            disabled={!selectedProjectId}
          >
            割り当て
          </button>
        </footer>
      </div>
    </div>
  );
};

// プロジェクト編集ダイアログ
const ProjectDialog = ({ open, onClose, project, onSubmit, formik, managersData }) => {
  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <h3>{project ? 'プロジェクトを編集' : 'プロジェクトを追加'}</h3>
        </header>
        <form onSubmit={formik.handleSubmit}>
          <div className="w3-container">
            <div className="w3-row-padding">
              <div className="w3-col m12">
                <label>プロジェクト名</label>
                <input
                  className={`w3-input w3-border ${formik.touched.name && formik.errors.name ? 'w3-border-red' : ''}`}
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="w3-text-red">{formik.errors.name}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>説明</label>
                <textarea
                  className="w3-input w3-border"
                  name="description"
                  rows="3"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="w3-col m6">
                <label>開始日</label>
                <input
                  className={`w3-input w3-border ${formik.touched.startDate && formik.errors.startDate ? 'w3-border-red' : ''}`}
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
                  className={`w3-select w3-border ${formik.touched.status && formik.errors.status ? 'w3-border-red' : ''}`}
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {formik.touched.status && formik.errors.status && (
                  <div className="w3-text-red">{formik.errors.status}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>プロジェクトマネージャー</label>
                <select
                  className={`w3-select w3-border ${formik.touched.managerIds && formik.errors.managerIds ? 'w3-border-red' : ''}`}
                  name="managerIds"
                  multiple
                  value={formik.values.managerIds}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    formik.setFieldValue('managerIds', selectedOptions);
                  }}
                >
                  {managersData?.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} - {manager.company?.name || '会社なし'}
                    </option>
                  ))}
                </select>
                {formik.touched.managerIds && formik.errors.managerIds && (
                  <div className="w3-text-red">{formik.errors.managerIds}</div>
                )}
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <div className="w3-bar w3-right-align">
              <button
                type="button"
                className="w3-button w3-gray w3-margin-right"
                onClick={onClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="w3-button w3-blue"
                disabled={formik.isSubmitting || !formik.isValid}
              >
                {project ? '更新' : '作成'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

const Projects = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: ''
  });
  const [sortBy, setSortBy] = useState('name');

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Excelエクスポート機能
  const handleExport = () => {
    // TODO: Excel出力機能の実装
    setSnackbar({
      open: true,
      message: 'Excel出力機能は現在開発中です',
      severity: 'info'
    });
  };

  // DndContextのsensorsをトップレベルで定義
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ&ドロップの処理
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = projectsData?.projects.findIndex(project => project.id === active.id);
      const newIndex = projectsData?.projects.findIndex(project => project.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // プロジェクトの順序を更新
        const reorderedProjects = arrayMove(projectsData.projects, oldIndex, newIndex);
        
        // TODO: バックエンドAPIを呼び出して順序を保存
        // 現在はフロントエンド側でのみ順序を変更
        queryClient.setQueryData(['projects', page, rowsPerPage, searchQuery, filters], {
          ...projectsData,
          projects: reorderedProjects
        });
      }
    }
  };

  // プロジェクト一覧の取得
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', page, rowsPerPage, searchQuery, filters],
    queryFn: async () => {
      try {
        console.log('Fetching projects with:', {
          page,
          rowsPerPage,
          search: searchQuery,
          filters,
          currentUser: {
            role: currentUser?.role,
            companyId: currentUser?.companyId,
            managedCompanyId: currentUser?.managedCompanyId
          }
        });

        const params = {
          page: page + 1,
          limit: rowsPerPage,
          search: searchQuery,
          include: ['members', 'company'],
          ...filters
        };

        // COMPANY権限の場合は会社IDを追加
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }

        const response = await api.get('/api/projects', { params });

        // デバッグ用：プロジェクトデータの詳細をログ出力
        console.log('Raw project data:', {
          firstProject: response.data.data.projects[0],
          members: response.data.data.projects[0]?.members,
          memberExample: response.data.data.projects[0]?.members?.[0]
        });

        // プロジェクトデータの加工（managers と members の分離）
        const transformedData = {
          ...response.data.data,
          projects: response.data.data.projects.map(project => ({
            ...project,
            managersCount: project.managers?.length || 0,
            membersCount: project.members?.length || 0
          }))
        };

        // APIレスポンスの詳細なデバッグ出力
        console.log('Projects API response:', {
          status: response.status,
          projectCount: transformedData.projects.length,
          firstProject: transformedData.projects[0] ? {
            id: transformedData.projects[0].id,
            name: transformedData.projects[0].name,
            membersCount: transformedData.projects[0].membersCount,
            managersCount: transformedData.projects[0].managersCount
          } : null
        });

        // メンバーシップの情報を含むプロジェクトデータを返す
        return response.data.data;
      } catch (error) {
        console.error('Error fetching projects:', {
          message: error.message,
          response: error.response?.data,
          request: {
            params,
            headers: error.config?.headers
          }
        });
        throw error;
      }
    }
  });

  // マネージャー一覧の取得（プロジェクトマネージャー選択用）
  const { data: managersData, isLoading: isLoadingManagers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          role: 'MANAGER',
          limit: 1000,
          include: ['company', 'projects', 'projectMemberships']
        }
      });
      console.log('Managers data:', {
        count: response.data.data.users.length,
        data: response.data.data.users,
        projects: response.data.data.users.map(u => u.projects?.length),
        memberships: response.data.data.users.map(u => u.projectMemberships?.length)
      });
      return response.data.data.users;
    }
  });

  // 全メンバー一覧の取得（未所属メンバー表示用）
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          limit: 1000,
          include: ['projectMemberships', 'company', 'projects']
        }
      });
      console.log('Members data:', {
        count: response.data.data.users.length,
        data: response.data.data.users,
        projects: response.data.data.users.map(u => u.projects?.length),
        memberships: response.data.data.users.map(u => u.projectMemberships?.length)
      });
      return response.data.data.users;
    }
  });

  // 未所属メンバーのフィルタリングロジック
  const unassignedMembers = useMemo(() => {
    if (!membersData || isLoadingMembers) {
      return [];
    }
    return membersData.filter(member => {
      const hasActiveProject = member.projects?.some(project => {
        const now = new Date();
        const startDate = project.startDate ? new Date(project.startDate) : null;
        const endDate = project.endDate ? new Date(project.endDate) : null;
        return startDate && startDate <= now && (!endDate || endDate > now);
      });
      return !hasActiveProject;
    });
  }, [membersData, isLoadingMembers]);

  // ソート機能の実装
  const sortedProjects = useMemo(() => {
    if (!projectsData?.projects) {
      return [];
    }
    return [...projectsData.projects].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'startDate':
          return new Date(a.startDate) - new Date(b.startDate);
        case 'endDate':
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
        default:
          return 0;
      }
    });
  }, [projectsData?.projects, sortBy]);

  // データ取得後の状態をログ出力
  console.log('Projects render state:', {
    isLoading,
    projectsData,
    sortedProjects: sortedProjects?.length
  });

  // プロジェクトの作成/更新
  const saveProject = useMutation({
    mutationFn: async (values) => {
      let companyId;
      if (currentUser?.role === 'COMPANY') {
        companyId = currentUser.managedCompanyId;
      } else if (currentUser?.role === 'MANAGER') {
        companyId = currentUser.companyId;
      }

      if (!companyId) {
        throw new Error('会社IDが見つかりません');
      }

      const projectData = {
        ...values,
        companyId,
        status: values.status.toUpperCase(),
        managerIds: values.managerIds || [],
        memberIds: values.memberIds || []
      };

      try {
        if (selectedProject) {
          const response = await api.patch(`/api/projects/${selectedProject.id}`, projectData);
          setSnackbar({
            open: true,
            message: 'プロジェクトを更新しました',
            severity: 'success'
          });
          return response.data;
        } else {
          const response = await api.post('/api/projects', projectData);
          setSnackbar({
            open: true,
            message: 'プロジェクトを作成しました',
            severity: 'success'
          });
          return response.data;
        }
      } catch (error) {
        const message = error.response?.data?.message || 'プロジェクトの保存に失敗しました';
        setSnackbar({
          open: true,
          message: message,
          severity: 'error'
        });
        throw error;
      }
    },
    onSuccess: () => {
      // クエリの無効化を修正
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] })
      ]);
      setSuccess(selectedProject ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Project save error:', {
        response: error.response?.data,
        validationErrors: error.response?.data?.error?.errors,
        requestData: error.config?.data,
        message: error.message
      });
      
      let errorMessage = 'プロジェクトの保存に失敗しました';
      
      if (error.response?.data?.error?.errors) {
        const validationErrors = error.response.data.error.errors;
        const errorMessages = validationErrors.map(err => {
          const field = err.field || err.param;
          const message = err.message || err.msg;
          const value = error.response.data.error.requestBody?.[field];
          return `${field}: ${message}${value ? ` (値: ${value})` : ''}`;
        }).join('\n');
        errorMessage = `バリデーションエラー:\n${errorMessages}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setSuccess('');
    }
  });

  // プロジェクトの削除
  const deleteProject = useMutation({
    mutationFn: async (projectId) => {
      const { data } = await api.delete(`/api/projects/${projectId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSuccess('プロジェクトを削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'プロジェクトの削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // プロジェクトへのメンバーの追加
  const addProjectMembers = async (projectId, members) => {
    try {
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // メンバーの追加を1件ずつ実行
      for (const member of members) {
        try {
          const response = await api.post(`/api/projects/${projectId}/members`, {
            userId: member.id
          });

          if (response.data.status === 'success') {
            successCount++;
          }
        } catch (error) {
          console.error('Error adding member:', {
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            error: {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message
            }
          });
          errorCount++;
          const errorMessage = error.response?.data?.message || error.response?.data?.error?.message || 'メンバーの追加に失敗しました';
          errors.push(`${member.firstName} ${member.lastName}: ${errorMessage}`);
        }
      }

      // 結果の通知
      if (successCount > 0) {
        setSnackbar({
          open: true,
          message: `${successCount}名のメンバーを追加しました${errorCount > 0 ? `（${errorCount}件の失敗）` : ''}`,
          severity: errorCount > 0 ? 'warning' : 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'メンバーの追加に失敗しました:\n' + errors.join('\n'),
          severity: 'error'
        });
      }

      // プロジェクトの情報を更新
      await queryClient.invalidateQueries({ queryKey: ['projects'] });

    } catch (error) {
      console.error('Error in addMembers:', error);
      setSnackbar({
        open: true,
        message: error.message || 'メンバーの追加中にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  // フォーム
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'ACTIVE',
      managerIds: [],
      memberIds: []  // メンバーIDの初期値を追加
    },
    validationSchema: projectSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        console.log('Form submitted with values:', {
          ...values,
          currentUser: {
            role: currentUser?.role,
            companyId: currentUser?.companyId,
            managedCompany: currentUser?.managedCompany
          }
        });
        await saveProject.mutateAsync(values);
      } catch (error) {
        console.error('Form submission error:', {
          error: error.message,
          response: error.response?.data,
          validationErrors: error.response?.data?.error?.errors
        });
        // Error handling is done in saveProject.mutate
      } finally {
        setSubmitting(false);
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    if (project) {
      // 日付の処理を修正
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.error('Date parsing error:', e);
          return '';
        }
      };

      formik.setValues({
        name: project.name,
        description: project.description || '',
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        status: project.status,
        managerIds: project.managers?.map(m => m.id) || [],
        memberIds: project.members?.map(m => m.id) || []  // メンバーIDを追加
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
    formik.resetForm();
  };

  // メンバー選択の処理
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [assignMemberDialogOpen, setAssignMemberDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(null);

  // メンバー選択の処理
  const handleMemberSelect = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  // メンバー割り当ての処理
  const handleAssignMember = async (members, projectId) => {
    try {
      // 基本的なバリデーション
      if (!projectId) {
        throw new Error('プロジェクトIDが指定されていません');
      }

      // プロジェクトの存在確認
      const project = projectsData?.projects.find(p => p.id === projectId);
      if (!project) {
        throw new Error('指定されたプロジェクトが見つかりません');
      }

      // 重複チェック
      const existingMemberIds = new Set([
        ...(project.members?.map(m => m.id) || []),
        ...(project.managers?.map(m => m.id) || [])
      ]);
      const newMembers = members.filter(member => !existingMemberIds.has(member.id));

      if (newMembers.length === 0) {
        throw new Error('選択されたメンバーは全て既にプロジェクトに所属しています');
      }

      setSuccess(`メンバーの割り当てを開始します... (0/${newMembers.length})`);
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // メンバーの追加を1件ずつ実行
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        try {
          const response = await api.post(`/api/projects/${projectId}/members`, {
            userId: member.id
          });

          if (response.data) {
            successCount++;
            setSuccess(`メンバーの割り当て中... (${successCount}/${members.length})`);
          }
        } catch (error) {
          failureCount++;
          console.error('Error adding member:', error);
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error?.message || 
                             error.message || 
                             'メンバーの追加に失敗しました';
          errors.push(`${member.firstName} ${member.lastName}: ${errorMessage}`);
        }
      }

      // クエリの無効化と再取得
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['members'] });

      // 結果の表示
      if (successCount > 0) {
        setSnackbar({
          open: true,
          message: `${successCount}名のメンバーを追加しました${failureCount > 0 ? `（${failureCount}件の失敗）` : ''}`,
          severity: failureCount > 0 ? 'warning' : 'success'
        });
      }
      
      if (failureCount > 0) {
        setError('以下のメンバーの追加に失敗しました:\n' + errors.join('\n'));
      } else {
        setError('');
      }

      setSuccess(successCount > 0 ? `${successCount}名のメンバーを追加しました` : '');
      
    } catch (error) {
      console.error('メンバー割り当て処理エラー:', error);
      setError(error.message || 'メンバーの追加中にエラーが発生しました');
      setSuccess('');
    }
  };

  // メンバー追加ダイアログ
  const handleOpenAddMemberDialog = (project) => {
    setTargetProject(project);
    setAddMemberDialogOpen(true);
  };

  const handleCloseAddMemberDialog = () => {
    setTargetProject(null);
    setAddMemberDialogOpen(false);
  };

  // メンバー追加処理
  const handleAddMembers = async (projectId, members) => {
    try {
      await addProjectMembers(projectId, members);
      setAddMemberDialogOpen(false);
      setTargetProject(null);
      // プロジェクト一覧を更新
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      console.error('メンバー追加エラー:', error);
      setError(error.message || 'メンバーの追加中にエラーが発生しました');
    }
  };

  const onRemoveMember = async (projectId, memberId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('メンバーの削除に失敗しました');
      }

      // プロジェクト一覧を再読み込み
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
      alert('メンバーの削除中にエラーが発生しました');
    }
  };

  return (
    <div className="w3-container">
      <h2 className="w3-text-blue">プロジェクト管理</h2>
      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green">
          <p>{success}</p>
        </div>
      )}
      <div className="w3-bar w3-border-bottom">
        <button
          className="w3-button w3-blue w3-margin-right"
          onClick={() => handleOpenDialog()}
        >
          <i className="fa fa-plus"></i> プロジェクトを追加
        </button>
        <div className="w3-dropdown-hover w3-margin-right">
          <button className="w3-button w3-gray">
            <i className="fa fa-filter"></i> フィルター
          </button>
          <div className="w3-dropdown-content w3-card-4">
            <div className="w3-container">
              <h6>ステータスで絞り込み</h6>
              <div className="w3-margin-bottom">
                <input
                  className="w3-check"
                  type="checkbox"
                  checked={filters.status === ''}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      status: ''
                    });
                  }}
                />
                <label className="w3-margin-left">全て表示</label>
              </div>
              {Object.entries(statusLabels).map(([value, label]) => (
                <div key={value} className="w3-margin-bottom">
                  <input
                    className="w3-check"
                    type="checkbox"
                    checked={filters.status === value}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        status: e.target.checked ? value : ''
                      });
                    }}
                  />
                  <label className="w3-margin-left">{label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w3-dropdown-hover w3-margin-right">
          <button className="w3-button w3-gray">
            <i className="fa fa-sort"></i> 並び替え
          </button>
          <div className="w3-dropdown-content w3-card-4">
            <div className="w3-container">
              <h6>並び替え条件</h6>
              <div className="w3-margin-bottom">
                <input
                  className="w3-radio"
                  type="radio"
                  name="sort"
                  value="name"
                  checked={sortBy === 'name'}
                  onChange={() => setSortBy('name')}
                />
                <label className="w3-margin-left">プロジェクト名</label>
              </div>
              <div className="w3-margin-bottom">
                <input
                  className="w3-radio"
                  type="radio"
                  name="sort"
                  value="startDate"
                  checked={sortBy === 'startDate'}
                  onChange={() => setSortBy('startDate')}
                />
                <label className="w3-margin-left">開始日</label>
              </div>
              <div className="w3-margin-bottom">
                <input
                  className="w3-radio"
                  type="radio"
                  name="sort"
                  value="endDate"
                  checked={sortBy === 'endDate'}
                  onChange={() => setSortBy('endDate')}
                />
                <label className="w3-margin-left">終了日</label>
              </div>
            </div>
          </div>
        </div>
        <div className="w3-dropdown-hover">
          <button className="w3-button w3-gray">
            <i className="fa fa-download"></i> 一括操作
          </button>
          <div className="w3-dropdown-content w3-card-4">
            <button
              className="w3-button w3-green"
              onClick={handleExport}
            >
              <i className="fa fa-file-excel-o"></i> Excelにエクスポート
            </button>
            <button
              className="w3-button w3-blue"
              onClick={() => setAssignMemberDialogOpen(true)}
            >
              <i className="fa fa-user-plus"></i> メンバーを一括追加
            </button>
          </div>
        </div>
      </div>
      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>プロジェクト名</th>
              <th>プロジェクトマネージャー</th>
              <th>ステータス</th>
              <th>開始日</th>
              <th>終了日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {console.log('Table render state:', {
              isLoading,
              projectsDataExists: !!projectsData,
              projectCount: projectsData?.projects?.length,
              sortedProjectCount: sortedProjects?.length
            })}
            {isLoading ? (
              <tr>
                <td colSpan="7" className="w3-center">
                  <div className="w3-padding">
                    <i className="fa fa-spinner fa-spin"></i> 読み込み中...
                  </div>
                </td>
              </tr>
            ) : sortedProjects?.length > 0 ? (
              sortedProjects.map((project) => {
                console.log('Rendering project:', {
                  id: project.id,
                  name: project.name,
                  managersCount: project.managers?.length,
                  membersCount: project.members?.length
                });
                return (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onEdit={handleOpenDialog}
                    onDelete={deleteProject.mutate}
                    onSelect={setSelectedProject}
                    onPeriodEdit={setPeriodDialogOpen}
                    members={membersData}
                    selectedMembers={selectedMembers}
                    onAddMembers={handleOpenAddMemberDialog}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="w3-center w3-text-gray">
                  プロジェクトが存在しません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* メンバー追加ダイアログ */}
      <AddMemberToProjectDialog
        open={addMemberDialogOpen}
        onClose={() => {
          setAddMemberDialogOpen(false);
          setTargetProject(null);
        }}
        project={targetProject}
        availableMembers={membersData}
        onAddMembers={handleAddMembers}
      />
      <ProjectDialog
        open={openDialog}
        onClose={handleCloseDialog}
        project={selectedProject}
        onSubmit={saveProject.mutate}
        formik={formik}
        managersData={managersData}
      />
      {periodDialogOpen && selectedMember && (
        <ProjectMemberPeriodDialog
          open={periodDialogOpen}
          onClose={() => setPeriodDialogOpen(false)}
          member={selectedMember}
          project={selectedProject}
          onSubmit={async (values) => {
            try {
              await api.patch(`/api/projects/${selectedProject.id}/members/${selectedMember.id}`, values);
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              setSuccess('メンバーの期間を更新しました');
            } catch (error) {
              setError('メンバーの期間の更新に失敗しました');
            } finally {
              setPeriodDialogOpen(false);
            }
          }}
        />
      )}
      <AssignMemberDialog
        open={assignMemberDialogOpen}
        onClose={() => setAssignMemberDialogOpen(false)}
        selectedMembers={selectedMembers}
        projects={projectsData?.projects || []}
        onAssign={handleAssignMember}
      />
    </div>
  );
};

// メンバー追加ダイアログ
const AddMemberDialog = ({ open, onClose, project, availableMembers, onSubmit }) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (selectedMemberIds.length === 0) {
      setError('メンバーを選択してください');
      return;
    }
    const selectedMembers = availableMembers.filter(m => selectedMemberIds.includes(m.id));
    onSubmit(selectedMembers, project.id);
    onClose();
  };

  if (!open) return null;

  // プロジェクトに既に所属しているメンバーを除外
  const projectMemberIds = [
    ...(project.members?.map(m => m.id) || []),
    ...(project.managers?.map(m => m.id) || [])
  ];
  const filteredMembers = availableMembers.filter(m => !projectMemberIds.includes(m.id));

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px' }}>
        <header className="w3-container w3-blue">
          <h3>メンバーの追加 - {project.name}</h3>
        </header>
        <div className="w3-container">
          <p>追加するメンバーを選択してください</p>
          {error && (
            <div className="w3-panel w3-red">
              <p>{error}</p>
            </div>
          )}
          <div className="w3-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="w3-table w3-bordered w3-striped">
              <thead>
                <tr>
                  <th></th>
                  <th>名前</th>
                  <th>役職</th>
                  <th>会社</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <tr key={member.id} className="w3-hover-light-gray">
                    <td>
                      <input
                        type="checkbox"
                        className="w3-check"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds([...selectedMemberIds, member.id]);
                          } else {
                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                          }
                          setError('');
                        }}
                      />
                    </td>
                    <td>{member.firstName} {member.lastName}</td>
                    <td>{member.position || '-'}</td>
                    <td>{member.company?.name || '-'}</td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="w3-center w3-text-gray">
                      追加可能なメンバーが存在しません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <footer className="w3-container w3-padding">
          <button className="w3-button w3-gray" onClick={onClose}>キャンセル</button>
          <button 
            className="w3-button w3-blue w3-right" 
            onClick={handleSubmit}
            disabled={selectedMemberIds.length === 0}
          >
            追加
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Projects;