import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import ProjectForm from '../../components/projects/ProjectForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import Snackbar from '../../components/Snackbar';
import api from '../../utils/axios';

const ProjectCreatePage = () => {
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

  // メンバーデータ取得（プロジェクト作成時にマネージャー選択で使用）
  const [membersData, setMembersData] = useState([]);

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

      return api.post('/projects', projectData);
    },
    onSuccess: (response) => {
      // キャッシュを無効化
      queryClient.invalidateQueries(['projects']);
      
      showSuccess('プロジェクトを作成しました');
      
      // 作成成功後はプロジェクト一覧に戻る
      setTimeout(() => {
        navigate('/projects');
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ プロジェクト作成エラー:', error);
      
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

  // パンくずリストのアイテム
  const breadcrumbItems = [
    { label: 'プロジェクト管理', path: '/projects' },
    { label: 'プロジェクト追加' }
  ];

  // 権限チェック
  if (currentUser?.role === 'MEMBER') {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>アクセス権限がありません</h3>
          <p>プロジェクトの作成権限がありません。</p>
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
          <h2>新しいプロジェクトを作成</h2>
          <p>プロジェクトの基本情報、クライアント情報、マネージャーを設定してください。</p>
        </header>
      </div>      {/* プロジェクト作成フォーム */}
      <div className="w3-row">
        <div className="w3-col l8 m12">
          <ProjectForm
            project={null} // 新規作成なのでnull
            onSubmit={(values, actions) => {
              createProjectMutation.mutate(values);
            }}
            onCancel={() => navigate('/projects')}
            isSubmitting={createProjectMutation.isPending || createProjectMutation.isLoading}
            isPageMode={true} // ページモード
          />
        </div>
        
        {/* サイドバー（ヘルプ情報など） */}
        <div className="w3-col l4 m12">
          <div className="w3-card-4 w3-white w3-margin-left">
            <header className="w3-container w3-light-grey">
              <h4>💡 プロジェクト作成のヒント</h4>
            </header>
            <div className="w3-container w3-padding">
              <h5>必須項目</h5>
              <ul className="w3-ul">
                <li>プロジェクト名</li>
                <li>開始日</li>
                <li>プロジェクトマネージャー</li>
              </ul>
              
              <h5>推奨設定</h5>
              <ul className="w3-ul">
                <li>プロジェクト説明</li>
                <li>終了予定日</li>
                <li>クライアント情報</li>
              </ul>
              
              <div className="w3-panel w3-light-blue">
                <p><strong>💡 Tip:</strong> プロジェクト作成後、メンバーの追加や詳細設定を行えます。</p>
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

export default ProjectCreatePage;
