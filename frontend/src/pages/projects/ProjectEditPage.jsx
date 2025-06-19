import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import ProjectForm from '../../components/projects/ProjectForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import Snackbar from '../../components/Snackbar';
import api from '../../utils/axios';

const ProjectEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  // ページ専用スキルデータ取得
  const {
    companySkills,
    defaultSkills,
    allSkills,
    skillStats,
    isLoading: pageSkillsLoading
  } = usePageSkills();

  // プロジェクトデータ取得
  const { data: projectData, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/projects/${id}`);
        return response.data.data || response.data;
      } catch (error) {
        throw error;
      }
    },
    enabled: Boolean(id),
    staleTime: 0, // 常に最新データを取得
  });

  // メンバーデータ取得
  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      try {
        const params = { limit: 1000, include: 'skills' };
        
        // ロールベースの会社フィルタリング
        if (currentUser?.role === 'COMPANY' && currentUser?.managedCompanyId) {
          params.companyId = currentUser.managedCompanyId;
        } else if (currentUser?.role === 'MANAGER' && currentUser?.companyId) {
          params.companyId = currentUser.companyId;
        }
        
        const response = await api.get('/users', { params });
        return response.data.data.users || response.data || [];
      } catch (error) {
        console.error('メンバー取得エラー:', error);
        return [];
      }
    },
    enabled: Boolean(currentUser && currentUser.role !== 'MEMBER'),
  });

  // プロジェクト更新のミューテーション
  const updateProjectMutation = useMutation({
    mutationFn: async (values) => {
      const projectData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,
        status: values.status.toUpperCase()
      };

      return api.patch(`/projects/${id}`, projectData);
    },
    onSuccess: async (response) => {
      // キャッシュを無効化
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['project', id]);
      queryClient.invalidateQueries(['members']);
      
      showSuccess('プロジェクトを更新しました');
      
      // 更新成功後はプロジェクト一覧に戻る
      setTimeout(() => {
        navigate('/projects');
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ プロジェクト更新エラー:', error);
      
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
          .map(err => `${err.param}: ${err.msg}`)
          .join('\n');
        showError(`入力エラー:\n${validationErrors}`);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'プロジェクトの更新に失敗しました';
        showError(errorMessage);
      }
    }
  });

  // パンくずリストのアイテム
  const breadcrumbItems = [
    { label: 'プロジェクト管理', path: '/projects' },
    { label: projectData?.name ? `${projectData.name} の編集` : 'プロジェクト編集' }
  ];

  // 権限チェック
  if (currentUser?.role === 'MEMBER') {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>アクセス権限がありません</h3>
          <p>プロジェクトの編集権限がありません。</p>
        </div>
      </div>
    );
  }

  // ローディング状態
  if (projectLoading) {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-center w3-padding">
          <div className="w3-spinner w3-border w3-border-blue"></div>
          <p>プロジェクトデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (projectError) {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>エラー</h3>
          <p>プロジェクトの読み込みに失敗しました。</p>
          <button 
            className="w3-button w3-blue"
            onClick={() => navigate('/projects')}
          >
            プロジェクト一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container w3-margin-top">
      {/* パンくずリスト */}
      <Breadcrumb items={breadcrumbItems} />
      
      {/* ページタイトル */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <header className="w3-container w3-blue w3-padding">
          <h2>プロジェクトを編集: {projectData?.name}</h2>
          <p>プロジェクトの情報を更新してください。</p>
        </header>
      </div>      {/* プロジェクト編集フォーム */}
      <div className="w3-row">
        <div className="w3-col l8 m12">
          <ProjectForm
            project={projectData}
            onSubmit={(values, actions) => {
              updateProjectMutation.mutate(values);
            }}
            onCancel={() => navigate('/projects')}
            isSubmitting={updateProjectMutation.isPending || updateProjectMutation.isLoading}
            isPageMode={true} // ページモード
          />
        </div>
        
        {/* サイドバー（プロジェクト情報など） */}
        <div className="w3-col l4 m12">
          <div className="w3-card-4 w3-white w3-margin-left">
            <header className="w3-container w3-light-grey">
              <h4>📊 プロジェクト情報</h4>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-margin-bottom">
                <strong>作成日:</strong><br />
                {projectData?.createdAt ? new Date(projectData.createdAt).toLocaleDateString() : '-'}
              </div>
              
              <div className="w3-margin-bottom">
                <strong>最終更新:</strong><br />
                {projectData?.updatedAt ? new Date(projectData.updatedAt).toLocaleDateString() : '-'}
              </div>
              
              <div className="w3-margin-bottom">
                <strong>メンバー数:</strong><br />
                {projectData?.members ? projectData.members.length : 0} 人
              </div>
              
              <div className="w3-margin-bottom">
                <strong>ステータス:</strong><br />
                <span className={`w3-tag ${
                  projectData?.status === 'IN_PROGRESS' ? 'w3-green' :
                  projectData?.status === 'COMPLETED' ? 'w3-blue' :
                  projectData?.status === 'PLANNED' ? 'w3-light-blue' : 'w3-orange'
                }`}>
                  {projectData?.status === 'IN_PROGRESS' ? '進行中' :
                   projectData?.status === 'COMPLETED' ? '完了' :
                   projectData?.status === 'PLANNED' ? '計画中' : 'その他'}
                </span>
              </div>
              
              <div className="w3-panel w3-light-blue">
                <p><strong>💡 Tip:</strong> プロジェクト更新後、メンバーやタスクの管理もできます。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* スナックバー */}
      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default ProjectEditPage;
