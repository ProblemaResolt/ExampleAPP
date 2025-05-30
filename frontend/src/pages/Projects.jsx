import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';
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
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import '../styles/Projects.css';

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
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return '-';
    }
  };

  return (
    <tr className="w3-hover-light-gray">
      <td>
        <input
          type="checkbox"
          className="w3-check"
          checked={selected}
          onChange={handleCheckboxClick}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td>
        <div className="w3-cell-row">
          <i className="fa fa-user w3-margin-right"></i>
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
        <span className={`w3-tag ${isManager ? 'w3-blue' : 'w3-light-gray'}`}>
          {isManager ? 'マネージャー' : 'メンバー'}
        </span>
      </td>
      <td>{formatDate(member.projectMembership?.startDate)}</td>
      <td>{formatDate(member.projectMembership?.endDate)}</td>
      <td>
        {member.lastLoginAt
          ? new Date(member.lastLoginAt).toLocaleString()
          : '未ログイン'}
      </td>
      <td>{new Date(member.createdAt).toLocaleDateString()}</td>
      <td>
        <div className="w3-bar">
          {!project ? (
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
          ) : (
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
          )}
        </div>
      </td>
    </tr>
  );
};

// プロジェクト行コンポーネント
const ProjectRow = ({ project, members, onEdit, onDelete, onSelect, onPeriodEdit, selectedMembers }) => {
  const [expanded, setExpanded] = useState(false);

  // プロジェクトのメンバーを取得（マネージャーを除外）
  const projectMembers = (project.members || []).filter(member => 
    !project.managers?.some(manager => manager.id === member.id)
  );
  const projectManagers = project.managers || [];

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
              <div className="w3-large">{project.name}</div>
              <div className="w3-small w3-text-gray">
                <div>プロジェクトマネージャー: {projectManagers.map(m => `${m.firstName} ${m.lastName}`).join(', ')}</div>
                <div>ステータス: <span className={`w3-tag ${statusColors[project.status]}`}>{statusLabels[project.status]}</span></div>
                <div>メンバー数: {projectMembers.length + projectManagers.length}名</div>
              </div>
            </div>
          </div>
        </td>
        <td>
          <div className="w3-bar">
            {projectManagers.map((manager) => (
              <span key={manager.id} className="w3-tag w3-blue w3-margin-right w3-margin-bottom">
                {manager.firstName} {manager.lastName}
                <button
                  className="w3-button w3-small w3-transparent"
                  onClick={() => onEdit(manager)}
                  title="マネージャー編集"
                >
                  <i className="fa fa-times"></i>
                </button>
              </span>
            ))}
          </div>
        </td>
        <td>
          <span className={`w3-tag ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </td>
        <td>{new Date(project.startDate).toLocaleDateString()}</td>
        <td>{project.endDate ? new Date(project.endDate).toLocaleDateString() : '未設定'}</td>
        <td>
          <div className="w3-bar">
            <button
              className="w3-button w3-small w3-blue"
              onClick={() => onEdit(project)}
              title="プロジェクト編集"
            >
              <i className="fa fa-edit"></i>
            </button>
            <button
              className="w3-button w3-small w3-red"
              onClick={() => {
                if (window.confirm('このプロジェクトを削除してもよろしいですか？\n所属メンバーは未所属になります。')) {
                  onDelete(project.id);
                }
              }}
              title="プロジェクト削除"
            >
              <i className="fa fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan="6" className="w3-padding-0">
            <div className="w3-container w3-light-gray w3-padding">
              <h6 className="w3-text-gray">プロジェクトメンバー一覧 ({projectMembers.length + projectManagers.length}名)</h6>
              <div className="w3-responsive">
                <table className="w3-table w3-bordered w3-striped">
                  <thead>
                    <tr>
                      <th></th>
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
                    {projectManagers.map((manager) => (
                      <MemberRow
                        key={`manager-${manager.id}`}
                        member={manager}
                        project={project}
                        onEdit={onEdit}
                        onSelect={onSelect}
                        onPeriodEdit={onPeriodEdit}
                        selected={selectedMembers.some(m => m.id === manager.id)}
                        isManager={true}
                      />
                    ))}
                    {projectMembers.map((member) => (
                      <MemberRow
                        key={`member-${member.id}`}
                        member={member}
                        project={project}
                        onEdit={onEdit}
                        onSelect={onSelect}
                        onPeriodEdit={onPeriodEdit}
                        selected={selectedMembers.some(m => m.id === member.id)}
                        isManager={false}
                      />
                    ))}
                    {projectMembers.length === 0 && projectManagers.length === 0 && (
                      <tr>
                        <td colSpan="9" className="w3-center w3-text-gray">
                          メンバーが割り当てられていません
                        </td>
                      </tr>
                    )}
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
      const response = await api.get('/api/projects', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: searchQuery,
          ...filters
        }
      });
      console.log('Fetched projects:', response.data.data.projects); // デバッグログ追加
      return response.data.data;
    }
  });

  // マネージャー一覧の取得（プロジェクトマネージャー選択用）
  const { data: managersData, isLoading: isLoadingManagers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const response = await api.get('/api/users', {
        params: {
          role: ['MANAGER'],
          limit: 1000,
          include: ['company']
        }
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
          include: ['projectMemberships', 'company']
        }
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
      queryClient.invalidateQueries(['project', projectId]);

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

      setSuccess(`メンバーの割り当てを開始します... (0/${members.length})`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const processedMembers = new Set(); // 重複防止用

      for (const member of members) {
        try {
          // メンバーのバリデーション
          if (!member?.id) {
            console.error('無効なメンバー:', member);
            continue;
          }

          // 重複チェック
          if (processedMembers.has(member.id)) {
            console.warn('重複メンバーをスキップ:', member);
            continue;
          }

          // 既存メンバーチェック
          if (project.members?.some(m => m.id === member.id)) {
            errors.push(`${member.firstName} ${member.lastName}: 既にプロジェクトのメンバーです`);
            errorCount++;
            continue;
          }

          processedMembers.add(member.id);

          console.log('メンバー追加リクエスト:', {
            projectId,
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`
          });

          const response = await api.post(`/api/projects/${projectId}/members`, {
            userId: member.id
          });

          if (response.data.status === 'success') {
            successCount++;
            setSuccess(`メンバーの割り当て中... (${successCount}/${members.length})`);
          }
        } catch (error) {
          console.error('メンバー割り当てエラー:', {
            projectId,
            member,
            error: {
              status: error.response?.status,
              message: error.response?.data?.message || error.message
            }
          });
          errorCount++;
          errors.push(
            `${member.firstName} ${member.lastName}: ${
              error.response?.data?.message || 
              error.response?.data?.error?.message || 
              error.message || 
              'メンバーの追加に失敗しました'
            }`
          );
        }
      }

      // クエリの無効化と再取得
      await queryClient.invalidateQueries({ queryKey: ['projects'] });

      // 結果の表示
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
    } catch (error) {
      console.error('メンバー割り当て処理エラー:', error);
      setSnackbar({
        open: true,
        message: error.message || 'メンバーの追加中にエラーが発生しました',
        severity: 'error'
      });
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
              <th></th>
              <th>プロジェクト名</th>
              <th>プロジェクトマネージャー</th>
              <th>ステータス</th>
              <th>開始日</th>
              <th>終了日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="w3-center">
                  <div className="w3-padding">
                    <i className="fa fa-spinner fa-spin"></i> 読み込み中...
                  </div>
                </td>
              </tr>
            ) : sortedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onEdit={handleOpenDialog}
                onDelete={deleteProject.mutate}
                onSelect={setSelectedProject}
                onPeriodEdit={setPeriodDialogOpen}
                members={membersData}
                selectedMembers={selectedMembers}
              />
            ))}
            {!isLoading && sortedProjects.length === 0 && (
              <tr>
                <td colSpan="7" className="w3-center w3-text-gray">
                  プロジェクトが存在しません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

export default Projects;