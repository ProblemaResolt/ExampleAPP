import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Snackbar, CircularProgress } from '@mui/material';
import { Edit as EditIcon, People as PeopleIcon, CalendarMonth as CalendarIcon, Add as AddIcon } from '@mui/icons-material';
import AddMemberDialog from '../components/AddMemberDialog';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import '../styles/Projects.css';
import api from '../utils/axios';

// バリデーションスキーマ
const projectSchema = yup.object({
  name: yup.string()
    .required('プロジェクト名は必須です')
    .max(100, 'プロジェクト名は100文字以内で入力してください'),
  description: yup.string()
    .max(500, '説明は500文字以内で入力してください'),
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
    .min(1, '少なくとも1人のプロジェクトマネージャーを選択してください')
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

// プロジェクト行コンポーネント
const ProjectRow = ({ project, onMemberManage, onPeriodEdit, onEdit, removeMemberMutation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // マネージャーとメンバーを分離
  const projectManagers = project.managers || [];
  const projectMembers = project.members?.filter(m => 
    !projectManagers.some(manager => manager.id === m.id)
  ) || [];

  // 終了日までの残り日数を計算
  const getDaysLeft = () => {
    if (!project.endDate || project.status !== 'ACTIVE') return null;
    const today = new Date();
    const endDate = new Date(project.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysLeft();
  const isNearDeadline = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isPastDeadline = daysLeft !== null && daysLeft < 0;
  const isCompleted = project.status === 'COMPLETED';

  const handleRemoveMember = (member) => {
    if (window.confirm(`${member.firstName} ${member.lastName}をプロジェクトから削除しますか？`)) {
      removeMemberMutation.mutate({
        projectId: project.id,
        memberId: member.id
      });
    }
  };

  return (
    <>
      <tr className={isCompleted ? 'w3-dark-grey w3-text-white' : isNearDeadline ? 'w3-pale-yellow' : isPastDeadline ? 'w3-pale-red' : ''}>
        <td>
          <button 
            className={`w3-button w3-block w3-left-align ${isCompleted ? 'w3-text-white' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w3-left-align">
              <strong>{project.name}</strong>
              <br />
              <small className={isCompleted ? 'w3-text-light-grey' : 'w3-text-grey'}>
                マネージャー: {projectManagers.length > 0 
                  ? projectManagers.map(manager => `${manager.firstName} ${manager.lastName}`).join(', ')
                  : '-'}
              </small>
              {!isCompleted && isNearDeadline && (
                <div className="w3-text-orange">
                  <small>⚠️ 終了まであと{daysLeft}日</small>
                </div>
              )}
              {!isCompleted && isPastDeadline && (
                <div className="w3-text-red">
                  <small>⚠️ 終了日を{Math.abs(daysLeft)}日経過</small>
                </div>
              )}
            </div>
          </button>
        </td>
        <td>
          <span className={`w3-tag ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </td>
        <td className={isCompleted ? 'w3-text-white' : ''}>
          {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
        </td>
        <td className={isCompleted ? 'w3-text-white' : ''}>
          {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
        </td>
        <td>
          <div className="w3-bar">
            <button 
              className={`w3-button w3-small w3-margin-right ${isCompleted ? 'w3-light-grey' : 'w3-green'}`}
              onClick={(e) => {
                e.stopPropagation();
                onMemberManage(project);
              }}
              title="メンバー管理"
            >
              <PeopleIcon />
            </button>
            <button
              className={`w3-button w3-small ${isCompleted ? 'w3-light-grey' : 'w3-blue'}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              title="プロジェクト編集"
            >
              <EditIcon />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan="5">
            <div className="w3-container">
              <h4>プロジェクトメンバー</h4>
              <table className="w3-table w3-striped w3-bordered w3-card">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>名前</th>
                    <th style={{ width: '15%' }}>役職</th>
                    <th style={{ width: '15%' }}>役割</th>
                    <th style={{ width: '15%' }}>開始日</th>
                    <th style={{ width: '15%' }}>終了日</th>
                    <th style={{ width: '20%' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[...projectManagers, ...projectMembers].map(member => (
                    <tr key={member.id}>
                      <td>{member.firstName} {member.lastName}</td>
                      <td>{member.position || '-'}</td>
                      <td>
                        <span className={`w3-tag ${projectManagers.some(m => m.id === member.id) ? 'w3-blue' : 'w3-light-gray'} w3-small`}>
                          {projectManagers.some(m => m.id === member.id) ? 'マネージャー' : 'メンバー'}
                        </span>
                      </td>
                      <td>
                        {member.projectMembership?.startDate 
                          ? new Date(member.projectMembership.startDate).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td>
                        {member.projectMembership?.endDate
                          ? new Date(member.projectMembership.endDate).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td>
                        <div className="w3-bar">
                          <button
                            className="w3-button w3-small w3-blue w3-margin-right"
                            onClick={() => onPeriodEdit(member, project)}
                            title="期間設定"
                          >
                            <CalendarIcon /> 期間設定
                          </button>
                          <button
                            className="w3-button w3-small w3-red"
                            onClick={() => handleRemoveMember(member)}
                            title="メンバーを削除"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// デバッグ用のエラーバウンダリー
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Projects page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <h2>エラーが発生しました</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// プロジェクト一覧ページのメインコンポーネント
const ProjectsPage = () => {
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.error('Unhandled error:', event.error);
      setDebug(event.error?.toString());
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <ErrorBoundary>
      <div className="w3-container">
        {debug && (
          <div className="w3-panel w3-red">
            <h3>デバッグ情報</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{debug}</pre>
          </div>
        )}
        <Projects />
      </div>
    </ErrorBoundary>
  );
};

// 既存のProjectsコンポーネント
const Projects = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [memberDialogProject, setMemberDialogProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // プロジェクトの状態をチェックし、必要な更新を行う
  const checkProjectStatus = async (project) => {
    // 完了状態のプロジェクトはチェック不要
    if (project.status === 'COMPLETED') return project;

    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const warningDays = 7; // 終了日の7日前から警告
    
    if (endDate) {
      // 終了日が過ぎている場合は強制的に完了状態に
      if (endDate < today) {
        try {
          const updateResponse = await api.patch(`/api/projects/${project.id}`, {
            status: 'COMPLETED'
          });
          
          // 活動履歴を記録
          await api.post('/api/activities', {
            type: 'PROJECT_STATUS_UPDATE',
            projectId: project.id,
            description: `プロジェクト「${project.name}」が終了日(${endDate.toLocaleDateString()})を過ぎたため、自動的に完了状態に更新されました。`,
            oldStatus: project.status,
            newStatus: 'COMPLETED'
          });

          setSnackbar({
            open: true,
            message: `プロジェクト「${project.name}」が終了日を過ぎたため、完了状態に更新されました。`,
            severity: 'info'
          });

          return updateResponse.data.data;
        } catch (error) {
          console.error('Error updating project status:', error);
          return project;
        }
      }
      // 終了日が近づいている場合（進行中のプロジェクトのみ）
      else if (endDate > today && 
               (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= warningDays &&
               project.status === 'ACTIVE') {
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        setSnackbar({
          open: true,
          message: `警告: プロジェクト「${project.name}」の終了日まであと${daysLeft}日です。`,
          severity: 'warning'
        });
      }
    }
    return project;
  };

  // メンバー一覧の取得
  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      try {
        const params = {
          include: ['company']
        };
        
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }

        const response = await api.get('/api/users', { params });
        return response.data.data;
      } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
    }
  });

  // プロジェクト一覧の取得
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const params = {
          include: ['members', 'company']
        };

        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }

        const response = await api.get('/api/projects', { params });
        const projects = response.data.data.projects;

        // 各プロジェクトの状態をチェック
        const updatedProjects = await Promise.all(
          projects.map((project) => checkProjectStatus(project))
        );

        return {
          ...response.data.data,
          projects: updatedProjects
        };
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    }
  });

  if (error) {
    console.error('Query error:', error); // デバッグログ
    return (
      <div className="w3-container w3-padding">
        <div className="w3-panel w3-red">
          <h3>エラーが発生しました</h3>
          <p>{error.message || 'プロジェクトの読み込みに失敗しました'}</p>
        </div>
      </div>
    );
  }

  // メンバー追加のミューテーション
  const addMemberMutation = useMutation({
    mutationFn: async ({ projectId, members }) => {
      const responses = await Promise.all(
        members.map(member =>
          api.post(`/api/projects/${projectId}/members`, {
            userId: member.id
          })
        )
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: 'メンバーを追加しました',
        severity: 'success'
      });
      setSelectedProject(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの追加に失敗しました',
        severity: 'error'
      });
    }
  });

  // メンバー期間更新のミューテーション
  const updateMemberPeriodMutation = useMutation({
    mutationFn: async ({ projectId, memberId, data }) => {
      await api.patch(`/api/projects/${projectId}/members/${memberId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: 'メンバーの期間を更新しました',
        severity: 'success'
      });
      handleClosePeriodDialog();
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの期間の更新に失敗しました',
        severity: 'error'
      });
    }
  });

  // プロジェクト作成/更新のミューテーション
  const saveProjectMutation = useMutation({
    mutationFn: async (values) => {
      const projectData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,
        status: values.status.toUpperCase()
      };

      if (selectedProject) {
        return api.patch(`/api/projects/${selectedProject.id}`, projectData);
      } else {
        return api.post('/api/projects', projectData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: selectedProject ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました',
        severity: 'success'
      });
      setOpenDialog(false);
      setSelectedProject(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'プロジェクトの保存に失敗しました',
        severity: 'error'
      });
    }
  });

  // メンバー削除のミューテーション
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberId }) => {
      await api.delete(`/api/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: 'メンバーを削除しました',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの削除に失敗しました',
        severity: 'error'
      });
    }
  });

  // 期間編集ダイアログの制御
  const handlePeriodEdit = (member, project) => {
    setSelectedMember(member);
    setSelectedProject(project);
    setPeriodDialogOpen(true);
  };

  const handleClosePeriodDialog = () => {
    setPeriodDialogOpen(false);
    setSelectedMember(null);
    setSelectedProject(null);
  };

  // スナックバーの制御
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // フォーム
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'ACTIVE',
      managerIds: []
    },
    validationSchema: projectSchema,
    onSubmit: saveProjectMutation.mutate
  });

  // プロジェクト編集ダイアログを開く
  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    if (project) {
      formik.setValues({
        name: project.name,
        description: project.description || '',
        startDate: project.startDate.split('T')[0],
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        status: project.status,
        managerIds: project.managers?.map(m => m.id) || []
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <CircularProgress /> 読み込み中...
      </div>
    );
  }

  return (
    <div className="w3-container">
      <h2 className="w3-text-blue">プロジェクト管理</h2>

      {/* プロジェクト追加ボタン */}
      <div className="w3-bar w3-margin-bottom">
        <button
          className="w3-button w3-blue"
          onClick={() => handleOpenDialog()}
        >
          <AddIcon /> プロジェクトを追加
        </button>
      </div>

      {/* プロジェクト一覧 */}
      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>プロジェクト名</th>
              <th>ステータス</th>
              <th>開始日</th>
              <th>終了日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {projectsData?.projects?.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                onMemberManage={setMemberDialogProject}
                onPeriodEdit={handlePeriodEdit}
                onEdit={handleOpenDialog}
                removeMemberMutation={removeMemberMutation}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* メンバー管理ダイアログ */}
      {memberDialogProject && (
        <AddMemberDialog
          open={!!memberDialogProject}
          onClose={() => setMemberDialogProject(null)}
          project={memberDialogProject}
          onSubmit={(members) => {
            addMemberMutation.mutate({
              projectId: memberDialogProject.id,
              members
            });
          }}
        />
      )}

      {/* 期間編集ダイアログ */}
      {periodDialogOpen && selectedMember && selectedProject && (
        <ProjectMemberPeriodDialog
          open={periodDialogOpen}
          onClose={handleClosePeriodDialog}
          member={selectedMember}
          project={selectedProject}
          onSave={(values) => {
            updateMemberPeriodMutation.mutate({
              projectId: selectedProject.id,
              memberId: selectedMember.id,
              data: values
            });
          }}
          projectStartDate={selectedProject.startDate}
          projectEndDate={selectedProject.endDate}
        />
      )}

      {/* プロジェクト編集ダイアログ */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedProject ? 'プロジェクトを編集' : 'プロジェクトを追加'}
          </DialogTitle>
          <DialogContent>
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
              </div>
              <div className="w3-col m12">
                <label>説明</label>
                <textarea
                  className="w3-input w3-border"
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
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
                <label>プロジェクトマネージャー</label>
                <select
                  className="w3-select w3-border"
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
                  }}
                >
                  {(membersData?.users || [])
                    .filter(member => member.role === 'MANAGER')
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                        {member.position ? ` (${member.position})` : ''}
                      </option>
                  ))}
                </select>
                {formik.touched.managerIds && formik.errors.managerIds && (
                  <div className="w3-text-red">{formik.errors.managerIds}</div>
                )}
                {(membersData?.users || []).filter(member => member.role === 'MANAGER').length === 0 && (
                  <div className="w3-text-orange">
                    マネージャーロールを持つユーザーがいません。プロジェクトを作成するにはマネージャーが必要です。
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>キャンセル</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {selectedProject ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* スナックバー通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

// ProjectsPageコンポーネントをエクスポート
export default ProjectsPage;