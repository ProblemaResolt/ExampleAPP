import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaCalendar, FaPlus, FaTrash, FaEdit, FaSpinner, FaEye, FaCog, FaListUl } from 'react-icons/fa';
import AddMemberDialog from '../components/AddMemberDialog';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import ProjectMemberAllocationDialog from '../components/ProjectMemberAllocationDialog';
import ProjectEditDialog from '../components/ProjectEditDialog';
import ProjectMembersModal from '../components/ProjectMembersModal';
import ProjectDetailModal from '../components/ProjectDetailModal';
import ProjectRow from '../components/ProjectRow';
import ProjectWorkSettingsManagement from '../components/ProjectWorkSettingsManagement';
import Snackbar from '../components/Snackbar';
import { useSnackbar } from '../hooks/useSnackbar';
import { projectSchema, statusLabels } from '../utils/validation';
import api from '../utils/axios';

// ステータスの色マッピング
const statusColors = {
  PLANNED: 'w3-light-blue',
  IN_PROGRESS: 'w3-green',
  COMPLETED: 'w3-blue',
  ON_HOLD: 'w3-orange'
};

// プロジェクト一覧ページのメインコンポーネント
const ProjectsPage = () => {
  return (
    <div className="w3-container">
      <Projects />
    </div>
  );
};

// 既存のProjectsコンポーネント
const Projects = () => {
  const {
    snackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideSnackbar
  } = useSnackbar();
    // タブ状態の追加
  const [activeTab, setActiveTab] = useState('list');
  
  const [memberDialogProject, setMemberDialogProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [membersModalProject, setMembersModalProject] = useState(null);
  const [detailModalProject, setDetailModalProject] = useState(null);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  // プロジェクトの状態をチェックし、必要な更新を行う
  const checkProjectStatus = async (project) => {
    // 完了状態のプロジェクトはチェック不要
    if (project.status === 'COMPLETED') return project;

    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const warningDays = 7; // 終了日の7日前から警告
    
    if (endDate) {      // 終了日が過ぎている場合は強制的に完了状態に
      if (endDate < today) {        try {
          const updateResponse = await api.patch(`/projects/${project.id}`, {
            name: project.name,
            description: project.description,
            clientCompanyName: project.clientCompanyName,
            clientContactName: project.clientContactName,
            clientContactPhone: project.clientContactPhone,
            clientContactEmail: project.clientContactEmail,
            clientPrefecture: project.clientPrefecture,
            clientCity: project.clientCity,
            clientStreetAddress: project.clientStreetAddress,
            startDate: project.startDate.split('T')[0],
            endDate: project.endDate ? project.endDate.split('T')[0] : null,
            status: 'COMPLETED',
            managerIds: project.managers?.map(m => m.id) || [],
            memberIds: project.members?.map(m => m.id) || []
          });
            // 活動履歴を記録（エンドポイントが存在しないためコメントアウト）
          // await api.post('/activities', {
          //   type: 'PROJECT_STATUS_UPDATE',
          //   projectId: project.id,
          //   description: `プロジェクト「${project.name}」が終了日(${endDate.toLocaleDateString()})を過ぎたため、自動的に完了状態に更新されました。`,
          //   oldStatus: project.status,
          //   newStatus: 'COMPLETED'
          // });

          showInfo(`プロジェクト「${project.name}」が終了日を過ぎたため、完了状態に更新されました。`);

          return updateResponse.data.data;
        } catch (error) {
          console.error('Error updating project status:', error);
          return project;
        }
      }
      // 終了日が近づいている場合（進行中のプロジェクトのみ）
      else if (endDate > today && 
               (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= warningDays &&               project.status === 'IN_PROGRESS') {
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        showWarning(`警告: プロジェクト「${project.name}」の終了日まであと${daysLeft}日です。`);
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
        
        // ロールベースの会社フィルタリング
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          // 会社管理者は管理している会社のユーザーのみ表示
          params.companyId = currentUser.managedCompanyId;
        } else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          // マネージャーは自分の会社のユーザーのみ表示
          params.companyId = currentUser.companyId;
        }
        // 注意: ADMINロールはcompanyIdパラメータを指定しないため、
        // バックエンドのusers.jsで会社フィルタリングを行う必要がある

        const response = await api.get('/users', { params });
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
        };// 会社管理者の場合は自分が管理する会社のプロジェクトのみ取得
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }
        // マネージャーの場合はバックエンドで自動的にフィルタリングされる（自分が参加しているプロジェクトのみ）
        const response = await api.get('/projects', { params });
        if (!response.data) {
          throw new Error('No response data from API');
        }
        
        // バックエンドの応答構造を正しく解析
        const responseData = response.data;
        let projectsData, total;
          // 正しい応答構造: response.data.data.projects
        if (responseData.data && Array.isArray(responseData.data.projects)) {
          projectsData = responseData.data.projects;
          total = responseData.data.total;
        } else if (Array.isArray(responseData.projects)) {
          // フォールバック: response.data.projects
          projectsData = responseData.projects;
          total = responseData.total;
        } else if (Array.isArray(responseData.data)) {
          // もう一つのフォールバック: response.data自体が配列
          projectsData = responseData.data;
          total = projectsData.length;
        } else {
          throw new Error('Invalid response structure: projects not found');
        }        // 各プロジェクトの状態をチェック
        const updatedProjects = await Promise.all(
          projectsData.map((project) => checkProjectStatus(project))
        );

        return {
          projects: updatedProjects,
          total: total || updatedProjects.length
        };
      } catch (error) {        console.error('Error fetching projects:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,       // 2分間キャッシュ（短めに設定して適度に更新）
    cacheTime: 1000 * 60 * 10,      // 10分間キャッシュ
    refetchOnWindowFocus: false,    // ウィンドウフォーカス時の再取得を無効
    refetchOnMount: false           // マウント時の再取得を無効
  });
  // メンバー追加のミューテーション
  const addMemberMutation = useMutation({
    mutationFn: async ({ projectId, members }) => {
      const responses = [];
      const errors = [];
      
      // メンバーを一つずつ追加（重複エラーを個別に処理）
      for (const member of members) {
        try {
          const memberData = {
            userId: member.id,
            allocation: member.allocation || 1.0
          };
          
          const response = await api.post(`/projects/${projectId}/members`, memberData);
          responses.push(response);
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'メンバーの追加に失敗しました';
          errors.push({
            member: `${member.lastName} ${member.firstName}`,
            error: errorMessage
          });
        }
      }
      
      return { responses, errors };
    },    onSuccess: (data, variables) => {
      const { responses, errors } = data;

      if (responses.length > 0) {
        showSuccess(`${responses.length}人のメンバーを追加しました`);
      }
      
      if (errors.length > 0) {
        const errorMessages = errors.map(e => `${e.member}: ${e.error}`).join('\n');
        showError(`一部のメンバーの追加に失敗しました:\n${errorMessages}`);
      }
      
      // メンバー追加ダイアログを閉じる
      setMemberDialogProject(null);
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'メンバーの追加に失敗しました');
    },    onSettled: async (data, error, variables) => {
      // 成功・失敗に関わらず、プロジェクトデータを強制的に更新
      const projectId = variables.projectId;
      
      
      // まずクエリを無効化してから再取得
      queryClient.invalidateQueries(['projects']);
      await queryClient.refetchQueries(['projects']);
      
      // 直接モーダルデータを更新
      const projectsData = queryClient.getQueryData(['projects']);
      const updatedProject = projectsData?.projects?.find(p => p.id === projectId);
      
      // setProjectsUpdateStatus({
      //   found: !!updatedProject,
      //   managersCount: updatedProject?.managers?.length || 0,
      //   membersCount: updatedProject?.members?.length || 0,
      //   shouldUpdateModal: membersModalProject?.id === projectId
      // });
      
      if (updatedProject && membersModalProject?.id === projectId) {
        setMembersModalProject(updatedProject);
      } else if (updatedProject) {
        // プロジェクトメンバーモーダルを再表示する
        setMembersModalProject(updatedProject);
      }
    }
  });
  // メンバー工数更新のミューテーション
  const updateMemberAllocationMutation = useMutation({
    mutationFn: async ({ projectId, memberId, allocation }) => {
      await api.patch(`/projects/${projectId}/members/${memberId}/allocation`, { allocation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      showSuccess('メンバーの工数を更新しました');
      handleCloseAllocationDialog();
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'メンバーの工数の更新に失敗しました');
    },
    onSettled: async (data, error, variables) => {
      // プロジェクトデータを更新
      const projectId = variables.projectId;
      await queryClient.refetchQueries(['projects']);
      
      // 直接モーダルデータを更新
      const projectsData = queryClient.getQueryData(['projects']);
      const updatedProject = projectsData?.projects?.find(p => p.id === projectId);
      if (updatedProject && membersModalProject?.id === projectId) {
        setMembersModalProject(updatedProject);
      }
    }
  });

  // メンバー期間更新のミューテーション
  const updateMemberPeriodMutation = useMutation({
    mutationFn: async ({ projectId, memberId, data }) => {
      await api.patch(`/projects/${projectId}/members/${memberId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      showSuccess('メンバーの期間を更新しました');
      handleClosePeriodDialog();
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'メンバーの期間の更新に失敗しました');
    },
    onSettled: async (data, error, variables) => {
      // プロジェクトデータを更新
      const projectId = variables.projectId;
      await queryClient.refetchQueries(['projects']);
      
      // 直接モーダルデータを更新
      const projectsData = queryClient.getQueryData(['projects']);
      const updatedProject = projectsData?.projects?.find(p => p.id === projectId);
      if (updatedProject && membersModalProject?.id === projectId) {
        setMembersModalProject(updatedProject);
      }
    }
  });

  // プロジェクト作成/更新のミューテーション
  const saveProjectMutation = useMutation({
    mutationFn: async (values) => {
        // 必須フィールドのチェック（新規作成時のみ）
      if (!selectedProject && (!values.managerIds || values.managerIds.length === 0)) {
        console.error('❌ Manager IDs is empty or undefined:', values.managerIds);
        throw new Error('プロジェクトマネージャーを選択してください');
      }
      
      if (values.managerIds?.length > 0) {
      }
      
      const projectData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,
        status: values.status.toUpperCase()
      };


      if (selectedProject) {
        return api.patch(`/projects/${selectedProject.id}`, projectData);
      } else {
        return api.post('/projects', projectData);
      }
    },    onSuccess: (response) => {
      
      // 既存プロジェクトの更新の場合、selectedProjectを即座に更新
      if (selectedProject && response.data?.data?.project) {
        setSelectedProject(response.data.data.project);
      }
      
      queryClient.invalidateQueries(['projects']);
      showSuccess(selectedProject ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました');
      
      // 保存成功後はダイアログを閉じる（新規作成・編集両方）
      setOpenDialog(false);
      setSelectedProject(null);
    },
    onError: (error) => {
      console.error('=== プロジェクト保存エラー ===');
      console.error('エラー:', error);
      console.error('レスポンスデータ:', error.response?.data);
      console.error('レスポンススタータス:', error.response?.status);
      
      // バリデーションエラーの詳細表示
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
          .map(err => `${err.param}: ${err.msg}`)
          .join('\n');
        showError(`入力エラー:\n${validationErrors}`);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'プロジェクトの保存に失敗しました';
        showError(errorMessage);
      }
    }
  });

  // メンバー削除のミューテーション
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberId }) => {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      showSuccess('メンバーを削除しました');
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'メンバーの削除に失敗しました');
    },
    onSettled: async (data, error, variables) => {
      // プロジェクトデータを更新
      const projectId = variables.projectId;
      await queryClient.refetchQueries(['projects']);
      
      setTimeout(() => {
        const projectsData = queryClient.getQueryData(['projects']);
        const updatedProject = projectsData?.projects?.find(p => p.id === projectId);
        if (updatedProject && membersModalProject?.id === projectId) {
          setMembersModalProject(updatedProject);
        }
      }, 200);
    }
  });

  // プロジェクト削除のミューテーション
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      showSuccess('プロジェクトを削除しました');
    },
    onError: (error) => {
      showError(error.response?.data?.message || 'プロジェクトの削除に失敗しました');
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
    // プロジェクト編集ダイアログを開く
  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    setOpenDialog(true);
  };

  // エラーハンドリング
  if (error) {
    return (
      <div className="w3-container w3-padding">
        <div className="w3-panel w3-red">
          <h3>エラーが発生しました</h3>
          <p>{error.message || 'プロジェクトの読み込みに失敗しました'}</p>
        </div>
      </div>
    );
  }

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

      {/* タブナビゲーション */}
      <div className="w3-bar w3-border-bottom w3-margin-bottom">
        <button
          className={`w3-bar-item w3-button ${activeTab === 'list' ? 'w3-blue' : 'w3-white'}`}
          onClick={() => setActiveTab('list')}
        >
          <FaListUl className="w3-margin-right" />
          プロジェクト一覧
        </button>
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY' || currentUser?.role === 'MANAGER') && (
          <button
            className={`w3-bar-item w3-button ${activeTab === 'work-settings' ? 'w3-blue' : 'w3-white'}`}
            onClick={() => setActiveTab('work-settings')}
          >
            <FaCog className="w3-margin-right" />
            プロジェクト勤務設定
          </button>
        )}
      </div>

      {/* プロジェクト一覧タブ */}
      {activeTab === 'list' && (
        <>
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
                  <th>詳細</th>
                  <th>メンバー</th>
                  <th>プロジェクト名</th>
                  <th>ステータス</th>
                  <th>開始日</th>
                  <th>終了日</th>
                  <th>編集</th>
                </tr>
              </thead>
              <tbody>
                {projectsData?.projects?.map(project => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onView={setMembersModalProject}
                    onEdit={handleOpenDialog}
                    onDelete={deleteProjectMutation.mutate}
                    onDetailView={setDetailModalProject}
                    currentUser={currentUser}
                  />
                ))}
                {(!projectsData?.projects || projectsData.projects.length === 0) && (
                  <tr>
                    <td colSpan="7" className="w3-center w3-padding">
                      <div className="w3-text-grey">
                        プロジェクトがありません
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}      {/* メンバー勤務管理タブ */}
      {activeTab === 'work-settings' && (
        <div className="w3-card-4 w3-white">
          <header className="w3-container w3-blue w3-padding">
            <h3>
              <FaCog className="w3-margin-right" />
              メンバー勤務管理
            </h3>
            <p>参加しているプロジェクトのメンバー勤務設定状況を表示します。</p>
          </header>
          
          <div className="w3-container w3-padding">
            {/* 全プロジェクトの勤務設定管理を表示 */}
            {projectsData?.projects && projectsData.projects.length > 0 ? (
              projectsData.projects.map(project => (
                <div key={project.id} className="w3-margin-bottom">
                  <ProjectWorkSettingsManagement
                    projectId={project.id}
                    projectName={project.name}
                    currentUser={currentUser}
                  />
                </div>
              ))
            ) : (
              <div className="w3-panel w3-light-grey w3-center">
                <p>参加しているプロジェクトがありません。</p>
              </div>
            )}
          </div>
        </div>
      )}{/* メンバー管理ダイアログ */}
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
          onSave={handleSaveAllocation}        />
      )}      {/* プロジェクト編集ダイアログ */}
      <ProjectEditDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        project={selectedProject}
        onSubmit={saveProjectMutation.mutate}
        isSubmitting={saveProjectMutation.isPending || saveProjectMutation.isLoading}
        membersData={membersData}
        currentUser={currentUser}
      />{/* プロジェクトメンバー表示モーダル */}
      {membersModalProject && !memberDialogProject && (
        <ProjectMembersModal
          open={!!membersModalProject && !memberDialogProject}
          onClose={() => setMembersModalProject(null)}
          project={membersModalProject}
          onPeriodEdit={handlePeriodEdit}
          onAllocationEdit={handleAllocationEdit}
          onRemoveMember={(params) => {
            removeMemberMutation.mutate({
              projectId: params.projectId,
              memberId: params.memberId
            });
          }}
          onAddMember={(project) => {
            setMembersModalProject(null); // ProjectMembersModalを閉じる
            setMemberDialogProject(project); // AddMemberDialogを開く
          }}
          currentUser={currentUser}
        />
      )}

      {/* プロジェクト詳細モーダル */}
      {detailModalProject && (
        <ProjectDetailModal
          project={detailModalProject}
          isOpen={!!detailModalProject}
          onClose={() => setDetailModalProject(null)}
        />
      )}

      {/* 通知システム */}
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
        duration={3000}
      />
    </div>
  );
};

// ProjectsPageコンポーネントをエクスポート
export default ProjectsPage;