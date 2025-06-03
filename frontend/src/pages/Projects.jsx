import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaCalendar, FaPlus, FaTrash, FaEdit, FaSpinner, FaEye } from 'react-icons/fa';
import AddMemberDialog from '../components/AddMemberDialog';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import ProjectMemberAllocationDialog from '../components/ProjectMemberAllocationDialog';
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
const ProjectRow = ({ project, onMemberManage, onPeriodEdit, onEdit, onAllocationEdit, removeMemberMutation, onDelete, currentUser }) => {
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
            {/* メンバー管理ボタン - MEMBER ロール以外に表示 */}
            {currentUser?.role !== 'MEMBER' && (
              <button 
                className={`w3-button w3-small w3-margin-right ${isCompleted ? 'w3-light-grey' : 'w3-green'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMemberManage(project);
                }}
                title="メンバー管理"
              >
                <FaUser />
              </button>
            )}
            {/* プロジェクト編集ボタン - MEMBER ロール以外に表示 */}
            {currentUser?.role !== 'MEMBER' && (
              <button
                className={`w3-button w3-small w3-margin-right ${isCompleted ? 'w3-light-grey' : 'w3-blue'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                title="プロジェクト編集"
              >
                <FaEdit />
              </button>
            )}
            {/* プロジェクト削除ボタン - MEMBER ロール以外に表示 */}
            {currentUser?.role !== 'MEMBER' && (
              <button
                className="w3-button w3-small w3-red"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`プロジェクト「${project.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
                    onDelete(project.id);
                  }
                }}
                title="プロジェクト削除"
              >
                <FaTrash />
              </button>
            )}
            {/* MEMBER ロールの場合は表示専用のメッセージ */}
            {currentUser?.role === 'MEMBER' && (
              <span className="w3-text-grey">
                <FaEye className="w3-margin-right" />
                表示のみ
              </span>
            )}
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
                    <th style={{ width: '10%' }}>役職</th>
                    <th style={{ width: '10%' }}>スキル</th>
                    <th style={{ width: '10%' }}>工数</th>
                    <th style={{ width: '10%' }}>総工数</th>
                    <th style={{ width: '15%' }}>開始日</th>
                    <th style={{ width: '15%' }}>終了日</th>
                    <th style={{ width: '20%' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[...projectManagers, ...projectMembers].map(member => (
                    <tr key={member.id}>
                      <td>{member.firstName} {member.lastName}</td>
                      <td>
                        <span className={`w3-tag ${projectManagers.some(m => m.id === member.id) ? 'w3-blue' : 'w3-light-gray'} w3-small`}>
                          {projectManagers.some(m => m.id === member.id) ? 'マネージャー' : 'メンバー'}
                        </span>
                      </td>
                      <td>{member.position || '-'}</td>
                      <td>
                        <span className={`w3-tag ${(member.projectMembership?.allocation || 1.0) < 1 ? 'w3-yellow' : 'w3-green'}`}>
                          {Math.round((member.projectMembership?.allocation || 1.0) * 100)}%
                        </span>
                      </td>
                      <td>
                        <span className={`w3-tag ${(member.totalAllocation || 0) > 1 ? 'w3-red' : 'w3-teal'}`}>
                          {Math.round((member.totalAllocation || 0) * 100)}%
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
                          {/* MEMBER ロール以外のみ操作ボタンを表示 */}
                          {currentUser?.role !== 'MEMBER' && (
                            <>
                              <button
                                className="w3-button w3-small w3-blue w3-margin-right"
                                onClick={() => onPeriodEdit(member, project)}
                                title="期間設定"
                              >
                                <FaCalendar />
                              </button>
                              <button
                                className="w3-button w3-small w3-green w3-margin-right"
                                onClick={() => onAllocationEdit(member, project)}
                                title="工数設定"
                              >
                                {Math.round((member.projectMembership?.allocation || 1.0) * 100)}%
                              </button>
                              <button
                                className="w3-button w3-small w3-red"
                                onClick={() => handleRemoveMember(member)}
                                title="メンバーを削除"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {/* MEMBER ロールの場合は工数のみ表示 */}
                          {currentUser?.role === 'MEMBER' && (
                            <span className="w3-tag w3-teal">
                              {Math.round((member.projectMembership?.allocation || 1.0) * 100)}%
                            </span>
                          )}
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
  return (
    <ErrorBoundary>
      <div className="w3-container">
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
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // デバッグ: ユーザーロールを確認
  React.useEffect(() => {
    console.log('Projects - currentUser:', {
      role: currentUser?.role,
      canAccessMembers: currentUser?.role !== 'MEMBER'
    });
  }, [currentUser]);

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
      // MEMBERロールの場合は早期リターン
      if (currentUser?.role === 'MEMBER') {
        return { users: [] };
      }

      try {
        const params = {
          include: ['company']
        };
        
        // 会社管理者の場合は自分が管理する会社のユーザーのみ取得
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }
        // マネージャーの場合は自分の会社のユーザーのみ取得
        else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          params.companyId = currentUser.companyId;
        }

        const response = await api.get('/api/users', { params });
        return response.data.data;
      } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
    },
    enabled: Boolean(
      currentUser && 
      currentUser.role !== 'MEMBER' && 
      (currentUser.role === 'ADMIN' || currentUser.role === 'COMPANY' || currentUser.role === 'MANAGER')
    ),
    initialData: { users: [] }
  });

  // プロジェクト一覧の取得
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const params = {
          include: ['members', 'company']
        };

        // 会社管理者の場合は自分が管理する会社のプロジェクトのみ取得
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }
        // マネージャーの場合はバックエンドで自動的にフィルタリングされる（自分が参加しているプロジェクトのみ）

        console.log('Fetching projects with params:', params);
        const response = await api.get('/api/projects', { params });
        console.log('Full API response:', response);
        console.log('Response data:', response.data);
        console.log('Response data structure:', JSON.stringify(response.data, null, 2));
        
        if (!response.data) {
          console.error('No response data');
          throw new Error('No response data from API');
        }
        
        // バックエンドの応答構造を正しく解析
        // 実際の応答構造に基づいて修正
        const responseData = response.data;
        console.log('Response structure analysis:', {
          hasData: !!responseData.data,
          hasProjects: !!responseData.projects,
          dataKeys: Object.keys(responseData),
          dataDataKeys: responseData.data ? Object.keys(responseData.data) : null
        });
        
        let projectsData, total;
        
        // 正しい応答構造: response.data.data.projects
        if (responseData.data && Array.isArray(responseData.data.projects)) {
          projectsData = responseData.data.projects;
          total = responseData.data.total;
          console.log('Using correct structure: response.data.data.projects');
        } else if (Array.isArray(responseData.projects)) {
          // フォールバック: response.data.projects
          projectsData = responseData.projects;
          total = responseData.total;
          console.log('Using fallback structure: response.data.projects');
        } else if (Array.isArray(responseData.data)) {
          // もう一つのフォールバック: response.data自体が配列
          projectsData = responseData.data;
          total = projectsData.length;
          console.log('Using array fallback: response.data as array');
        } else {
          console.error('Cannot find projects in response:', responseData);
          console.error('Response data type:', typeof responseData.data);
          console.error('Response data content:', responseData.data);
          throw new Error('Invalid response structure: projects not found');
        }
        
        console.log('Extracted projects:', projectsData);
        console.log('Number of projects:', projectsData?.length || 0);
        console.log('Total count:', total);

        // 各プロジェクトの状態をチェック
        const updatedProjects = await Promise.all(
          projectsData.map((project) => checkProjectStatus(project))
        );

        console.log('Final processed projects:', updatedProjects);

        return {
          projects: updatedProjects,
          total: total || updatedProjects.length
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
      console.log('Adding members to project:', { projectId, members }); // デバッグ用
      
      const responses = await Promise.all(
        members.map(member => {
          const memberData = {
            userId: member.id,
            allocation: member.allocation || 1.0 // 工数を含めて送信
          };
          console.log('Sending member data:', memberData); // デバッグ用
          
          return api.post(`/api/projects/${projectId}/members`, memberData);
        })
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
      setMemberDialogProject(null); // ダイアログをクローズ
    },
    onError: (error) => {
      console.error('Member addition error:', error); // デバッグ用
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの追加に失敗しました',
        severity: 'error'
      });
    }
  });

  // メンバー工数更新のミューテーション
  const updateMemberAllocationMutation = useMutation({
    mutationFn: async ({ projectId, memberId, allocation }) => {
      await api.patch(`/api/projects/${projectId}/members/${memberId}/allocation`, { allocation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: 'メンバーの工数を更新しました',
        severity: 'success'
      });
      handleCloseAllocationDialog();
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの工数の更新に失敗しました',
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

  // プロジェクト削除のミューテーション
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      await api.delete(`/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: 'プロジェクトを削除しました',
        severity: 'success'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'プロジェクトの削除に失敗しました',
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

  // 工数編集ダイアログの制御
  const handleAllocationEdit = (member, project) => {
    setSelectedMember(member);
    setSelectedProject(project);
    setAllocationDialogOpen(true);
  };

  const handleCloseAllocationDialog = () => {
    setAllocationDialogOpen(false);
    setSelectedMember(null);
    setSelectedProject(null);
  };

  const handleSaveAllocation = async (values) => {
    if (!selectedProject || !selectedMember) {
      throw new Error('プロジェクトまたはメンバーが選択されていません');
    }
    
    await updateMemberAllocationMutation.mutateAsync({
      projectId: selectedProject.id,
      memberId: selectedMember.id,
      allocation: values.allocation
    });
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
      managerIds: [],
      managerAllocations: {}  // マネージャーの工数設定を追加
    },
    validationSchema: projectSchema,
    onSubmit: saveProjectMutation.mutate
  });

  // プロジェクト編集ダイアログを開く
  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    if (project) {
      const managerAllocations = {};
      project.managers?.forEach(manager => {
        managerAllocations[manager.id] = manager.projectMembership?.allocation || 1.0;
      });
      
      formik.setValues({
        name: project.name,
        description: project.description || '',
        startDate: project.startDate.split('T')[0],
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        status: project.status,
        managerIds: project.managers?.map(m => m.id) || [],
        managerAllocations
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <FaSpinner className="fa-spin w3-xxlarge w3-text-blue" />
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w3-container">
      <h2 className="w3-text-blue">プロジェクト管理</h2>

      {/* プロジェクト追加ボタン */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY' || currentUser?.role === 'MANAGER') && (
        <div className="w3-bar w3-margin-bottom">
          <button
            className="w3-button w3-blue"
            onClick={() => handleOpenDialog()}
          >
            <FaPlus /> プロジェクトを追加
          </button>
        </div>
      )}

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
                onMemberManage={currentUser?.role !== 'MEMBER' ? setMemberDialogProject : () => {}}
                onPeriodEdit={handlePeriodEdit}
                onAllocationEdit={handleAllocationEdit}
                onEdit={handleOpenDialog}
                removeMemberMutation={removeMemberMutation}
                onDelete={deleteProjectMutation.mutate}
                currentUser={currentUser}
              />
            ))}
            {(!projectsData?.projects || projectsData.projects.length === 0) && (
              <tr>
                <td colSpan="5" className="w3-center w3-padding">
                  <div className="w3-text-grey">
                    プロジェクトがありません
                    <br />
                    <small>
                      データ状態: {projectsData ? 'データあり' : 'データなし'} | 
                      プロジェクト配列: {projectsData?.projects ? `${projectsData.projects.length}個` : 'なし'} |
                      プロジェクト数: {projectsData?.total || 'undefined'}
                    </small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* メンバー管理ダイアログ */}
      {memberDialogProject && currentUser?.role !== 'MEMBER' && (
        <AddMemberDialog
          open={!!memberDialogProject && currentUser?.role !== 'MEMBER'}
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

      {/* 工数編集ダイアログ */}
      {allocationDialogOpen && selectedMember && selectedProject && (
        <ProjectMemberAllocationDialog
          open={allocationDialogOpen}
          onClose={handleCloseAllocationDialog}
          member={selectedMember}
          project={selectedProject}
          onSave={handleSaveAllocation}
        />
      )}

      {/* プロジェクト編集ダイアログ */}
      {openDialog && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '800px' }}>
            <header className="w3-container w3-blue">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setOpenDialog(false)}
              >
                &times;
              </span>
              <h3>{selectedProject ? 'プロジェクトを編集' : 'プロジェクトを追加'}</h3>
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
                      }}
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
                        const newTotal = totalAllocation - (selectedProject?.managers?.find(m => m.id === managerId)?.projectMembership?.allocation || 0) + allocation;
                        const isExceeded = newTotal > 1.0;
                        
                        return (
                          <div key={managerId} className="w3-row w3-margin-bottom">
                            <div className="w3-col m6">
                              <label>{manager?.firstName} {manager?.lastName}</label>
                              <div className="w3-text-grey w3-small">
                                現在の総工数: {Math.round(totalAllocation * 100)}%
                                {selectedProject && selectedProject.managers?.find(m => m.id === managerId) && (
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
                  onClick={() => setOpenDialog(false)}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w3-button w3-blue w3-right"
                  disabled={formik.isSubmitting}
                >
                  {formik.isSubmitting ? (
                    <>
                      <FaSpinner className="fa-spin w3-margin-right" />
                      {selectedProject ? '更新中...' : '作成中...'}
                    </>
                  ) : (
                    selectedProject ? '更新' : '作成'
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* 通知メッセージ */}
      {snackbar.open && (
        <div className={`w3-panel w3-card w3-display-bottomright w3-animate-bottom ${
          snackbar.severity === 'success' ? 'w3-green' : 
          snackbar.severity === 'error' ? 'w3-red' : 
          snackbar.severity === 'warning' ? 'w3-orange' : 'w3-blue'
        }`} style={{ margin: '20px', maxWidth: '300px', zIndex: 1000 }}>
          <span 
            className="w3-button w3-right w3-large"
            onClick={handleCloseSnackbar}
          >
            &times;
          </span>
          <p>{snackbar.message}</p>
        </div>
      )}
    </div>
  );
};

// ProjectsPageコンポーネントをエクスポート
export default ProjectsPage;