import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../hooks/useSnackbar';
import ProjectEditDialog from '../components/ProjectEditDialog';
import Breadcrumb from '../components/common/Breadcrumb';
import Snackbar from '../components/Snackbar';
import api from '../utils/axios';

const ProjectAddPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const {
    snackbar,
    showSuccess,
    showError,
    hideSnackbar
  } = useSnackbar();

  // プロジェクト作成のミューテーション
  const createProjectMutation = useMutation({
    mutationFn: async (values) => {
      // 必須フィールドのチェック
      if (!values.managerIds || values.managerIds.length === 0) {
        throw new Error('プロジェクトマネージャーを選択してください');
      }
      
      const projectData = {
        ...values,
        companyId: currentUser.managedCompanyId || currentUser.companyId,
        status: values.status.toUpperCase(),
        isCreating: true
      };
    },
    onSuccess: (response) => {
      // プロジェクト一覧を無効化
      queryClient.invalidateQueries(['projects']);
      
      showSuccess('プロジェクトを作成しました');
      
      // プロジェクト一覧ページに戻る
      navigate('/projects');
    },
    onError: (error) => {
      console.error('=== プロジェクト作成エラー ===');
      console.error('エラー:', error);
      console.error('レスポンスデータ:', error.response?.data);
      
      // バリデーションエラーの詳細表示
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
          .map(err => `${err.param}: ${err.msg}`)
          .join('\n');
        showError(`入力エラー:\n${validationErrors}`);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'プロジェクトの作成に失敗しました';
        showError(errorMessage);
      }
    }
  });

  const breadcrumbItems = [
    { label: 'プロジェクト管理', path: '/projects' },
    { label: 'プロジェクト追加', path: '/projects/add', icon: <FaPlus /> }
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="w3-container">
        <header className="w3-margin-bottom">
          <h2 className="w3-text-blue">
            <FaPlus className="w3-margin-right" />
            新しいプロジェクトを追加
          </h2>
          <p className="w3-text-grey">プロジェクト情報を入力して新しいプロジェクトを作成します。</p>
        </header>

        <ProjectEditDialog
          open={true}
          onClose={() => navigate('/projects')}
          project={null} // 新規作成なのでnull
          onSubmit={createProjectMutation.mutate}
          isSubmitting={createProjectMutation.isPending || createProjectMutation.isLoading}
          currentUser={currentUser}
        />
      </div>

      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default ProjectAddPage;
