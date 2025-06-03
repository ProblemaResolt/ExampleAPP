import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import ProjectRow from '../components/ProjectRow';
import ProjectMembersModal from '../components/ProjectMembersModal';
import ProjectEditModal from '../components/ProjectEditModal';
import ProjectMemberPeriodDialog from '../components/ProjectMemberPeriodDialog';
import ProjectMemberAllocationDialog from '../components/ProjectMemberAllocationDialog';
import AddMemberDialog from '../components/AddMemberDialog';

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [membersModalProject, setMembersModalProject] = useState(null);
  const [projectEditModalOpen, setProjectEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [addMemberProject, setAddMemberProject] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

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

        const response = await api.get('/api/projects', { params });
        
        // バックエンドの応答構造を正しく解析
        const responseData = response.data;
        let projectsData, total;
        
        if (responseData.data && Array.isArray(responseData.data.projects)) {
          projectsData = responseData.data.projects;
          total = responseData.data.total;
        } else if (Array.isArray(responseData.projects)) {
          projectsData = responseData.projects;
          total = responseData.total;
        } else if (Array.isArray(responseData.data)) {
          projectsData = responseData.data;
          total = projectsData.length;
        } else {
          throw new Error('Invalid response structure: projects not found');
        }

        return {
          projects: projectsData,
          total: total || projectsData.length
        };
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    }
  });

  // ProjectEditModal用のメンバーデータクエリ
  const { data: membersData } = useQuery({
    queryKey: ['members-for-projects', currentUser?.managedCompanyId, currentUser?.companyId],
    queryFn: async () => {
      try {
        const params = {
          limit: 1000,
          include: ['company']
        };
        
        // 会社管理者の場合、自社のメンバーのみを取得
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        }
        // マネージャーの場合、自分の会社のメンバーのみを取得
        else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          params.companyId = currentUser.companyId;
        }

        const response = await api.get('/api/users', { params });
        return response.data.data;
      } catch (error) {
        console.error('Error fetching members for projects:', error);
        throw error;
      }
    },
    enabled: Boolean(
      currentUser && 
      (currentUser.role === 'ADMIN' || currentUser.role === 'COMPANY' || currentUser.role === 'MANAGER')
    ),
    initialData: { users: [] }
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

  // メンバー削除のミューテーション
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberId }) => {
      await api.delete(`/api/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      
      // モーダルのプロジェクトデータも更新
      if (membersModalProject) {
        const updatedProjectsData = queryClient.getQueryData(['projects']);
        const updatedProject = updatedProjectsData?.projects?.find(p => p.id === membersModalProject.id);
        if (updatedProject) {
          setMembersModalProject(updatedProject);
        }
      }
      
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

  // メンバー期間更新のミューテーション
  const updateMemberPeriodMutation = useMutation({
    mutationFn: async ({ projectId, memberId, data }) => {
      await api.patch(`/api/projects/${projectId}/members/${memberId}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      
      // モーダルのプロジェクトデータも更新
      if (membersModalProject) {
        const updatedProjectsData = queryClient.getQueryData(['projects']);
        const updatedProject = updatedProjectsData?.projects?.find(p => p.id === membersModalProject.id);
        if (updatedProject) {
          setMembersModalProject(updatedProject);
        }
      }
      
      setSnackbar({
        open: true,
        message: 'メンバーの期間を更新しました',
        severity: 'success'
      });
      setPeriodDialogOpen(false);
      setSelectedMember(null);
      setSelectedProject(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの期間の更新に失敗しました',
        severity: 'error'
      });
    }
  });

  // メンバー工数更新のミューテーション
  const updateMemberAllocationMutation = useMutation({
    mutationFn: async ({ projectId, memberId, allocation }) => {
      await api.patch(`/api/projects/${projectId}/members/${memberId}/allocation`, { allocation });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      
      // モーダルのプロジェクトデータも更新
      if (membersModalProject) {
        const updatedProjectsData = queryClient.getQueryData(['projects']);
        const updatedProject = updatedProjectsData?.projects?.find(p => p.id === membersModalProject.id);
        if (updatedProject) {
          setMembersModalProject(updatedProject);
        }
      }
      
      setSnackbar({
        open: true,
        message: 'メンバーの工数を更新しました',
        severity: 'success'
      });
      setAllocationDialogOpen(false);
      setSelectedMember(null);
      setSelectedProject(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの工数の更新に失敗しました',
        severity: 'error'
      });
    }
  });

  // メンバー追加のミューテーション
  const addMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberData }) => {
      // 複数のメンバーを順次追加
      const results = [];
      for (const member of memberData) {
        const response = await api.post(`/api/projects/${projectId}/members`, {
          userId: member.id,
          allocation: member.allocation
        });
        results.push(response.data);
      }
      return results;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['projects']);
      
      // モーダルのプロジェクトデータも更新
      if (membersModalProject) {
        const updatedProjectsData = queryClient.getQueryData(['projects']);
        const updatedProject = updatedProjectsData?.projects?.find(p => p.id === membersModalProject.id);
        if (updatedProject) {
          setMembersModalProject(updatedProject);
        }
      }
      
      setSnackbar({
        open: true,
        message: 'メンバーを追加しました',
        severity: 'success'
      });
      setAddMemberDialogOpen(false);
      setAddMemberProject(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'メンバーの追加に失敗しました',
        severity: 'error'
      });
    }
  });

  // プロジェクト作成/更新のミューテーション
  const saveProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      if (selectedProject) {
        // 既存プロジェクトの更新
        const response = await api.patch(`/api/projects/${selectedProject.id}`, projectData);
        return response.data;
      } else {
        // 新規プロジェクトの作成
        const response = await api.post('/api/projects', projectData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSnackbar({
        open: true,
        message: selectedProject ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました',
        severity: 'success'
      });
      setProjectEditModalOpen(false);
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

  // プロジェクトメンバーモーダルを開く
  const handleOpenMembersModal = (project) => {
    setMembersModalProject(project);
  };

  // プロジェクト編集モーダルを開く
  const handleOpenEditModal = (project = null) => {
    setSelectedProject(project);
    setProjectEditModalOpen(true);
  };

  // 期間編集の処理
  const handlePeriodEdit = (member, project) => {
    setSelectedMember(member);
    setSelectedProject(project);
    setPeriodDialogOpen(true);
  };

  // 工数編集の処理
  const handleAllocationEdit = (member, project) => {
    setSelectedMember(member);
    setSelectedProject(project);
    setAllocationDialogOpen(true);
  };

  // メンバー削除の処理
  const handleRemoveMember = ({ projectId, memberId }) => {
    removeMemberMutation.mutate({ projectId, memberId });
  };

  // メンバー追加の処理
  const handleAddMember = (project) => {
    setAddMemberProject(project);
    setAddMemberDialogOpen(true);
  };

  // メンバー追加の実行
  const handleSubmitAddMember = (memberData) => {
    if (addMemberProject) {
      addMemberMutation.mutate({
        projectId: addMemberProject.id,
        memberData
      });
    }
  };

  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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

      {/* プロジェクト追加ボタン */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'COMPANY' || currentUser?.role === 'MANAGER') && (
        <div className="w3-bar w3-margin-bottom">
          <button
            className="w3-button w3-blue"
            onClick={() => handleOpenEditModal()}
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
                onView={handleOpenMembersModal}
                onEdit={handleOpenEditModal}
                onDelete={deleteProjectMutation.mutate}
                currentUser={currentUser}
              />
            ))}
            {(!projectsData?.projects || projectsData.projects.length === 0) && (
              <tr>
                <td colSpan="5" className="w3-center w3-padding">
                  <div className="w3-text-grey">
                    プロジェクトがありません
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* プロジェクトメンバーモーダル */}
      {membersModalProject && (
        <ProjectMembersModal
          project={membersModalProject}
          open={!!membersModalProject}
          onClose={() => setMembersModalProject(null)}
          onPeriodEdit={handlePeriodEdit}
          onAllocationEdit={handleAllocationEdit}
          onRemoveMember={handleRemoveMember}
          onAddMember={handleAddMember}
          currentUser={currentUser}
        />
      )}

      {/* プロジェクト編集モーダル */}
      {projectEditModalOpen && (
        <ProjectEditModal
          project={selectedProject}
          open={projectEditModalOpen}
          onClose={() => {
            setProjectEditModalOpen(false);
            setSelectedProject(null);
          }}
          onSave={(values) => {
            saveProjectMutation.mutate(values);
          }}
          isLoading={saveProjectMutation.isPending}
          membersData={membersData}
          currentUser={currentUser}
        />
      )}

      {/* 期間編集ダイアログ */}
      {periodDialogOpen && selectedMember && selectedProject && (
        <ProjectMemberPeriodDialog
          open={periodDialogOpen}
          onClose={() => {
            setPeriodDialogOpen(false);
            setSelectedMember(null);
            setSelectedProject(null);
          }}
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
          onClose={() => {
            setAllocationDialogOpen(false);
            setSelectedMember(null);
            setSelectedProject(null);
          }}
          member={selectedMember}
          project={selectedProject}
          onSave={(values) => {
            updateMemberAllocationMutation.mutate({
              projectId: selectedProject.id,
              memberId: selectedMember.id,
              allocation: values.allocation
            });
          }}
        />
      )}

      {/* メンバー追加ダイアログ */}
      {addMemberDialogOpen && addMemberProject && (
        <AddMemberDialog
          open={addMemberDialogOpen}
          onClose={() => {
            setAddMemberDialogOpen(false);
            setAddMemberProject(null);
          }}
          project={addMemberProject}
          onSubmit={handleSubmitAddMember}
        />
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

export default Projects;