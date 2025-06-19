import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaQuestionCircle, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import ProjectForm from '../../components/projects/ProjectForm';
import Breadcrumb from '../../components/common/Breadcrumb';
import Snackbar from '../../components/Snackbar';
import api from '../../utils/axios';

const ProjectCreatePage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();  const queryClient = useQueryClient();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [showHelp, setShowHelp] = useState(false);

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
          <div className="w3-bar">
            <div className="w3-bar-item">
              <h2>新しいプロジェクトを作成</h2>
              <p>プロジェクトの基本情報、クライアント情報、マネージャーを設定してください。</p>
            </div>
            <div className="w3-bar-item w3-right">
              <button
                className="w3-button w3-circle w3-white w3-text-blue w3-hover-light-grey"
                onClick={() => setShowHelp(true)}
                title="プロジェクト作成のヘルプ"
              >
                <FaQuestionCircle />
              </button>
            </div>
          </div>
        </header>
      </div>      {/* プロジェクト作成フォーム */}
      <div className="w3-row">
        <div className="w3-col l12 m12">
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
      </div>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div className="w3-modal" style={{ display: 'block', zIndex: 1003 }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px' }}>
            <header className="w3-container w3-blue">
              <span 
                onClick={() => setShowHelp(false)}
                className="w3-button w3-display-topright w3-hover-red"
              >
                <FaTimes />
              </span>
              <h3>💡 プロジェクト作成のヘルプ</h3>
            </header>
              <div className="w3-container w3-padding">
              <h5>📋 必須項目</h5>
              <div className="w3-panel w3-light-red w3-leftbar w3-border-red w3-margin-bottom">
                <ul className="w3-ul">
                  <li><strong>プロジェクト名</strong> - わかりやすく具体的な名前を設定</li>
                  <li><strong>開始日</strong> - プロジェクト開始予定日を選択</li>
                  <li><strong>プロジェクトマネージャー</strong> - 責任者を必ず選択してください</li>
                </ul>
              </div>
              
              <h5>📝 推奨設定項目</h5>
              <div className="w3-panel w3-light-blue w3-leftbar w3-border-blue w3-margin-bottom">
                <ul className="w3-ul">
                  <li><strong>プロジェクト説明</strong> - 概要や目的を記載</li>
                  <li><strong>終了予定日</strong> - 完了予定日の設定</li>
                  <li><strong>クライアント情報</strong> - 連絡先や住所の登録</li>
                  <li><strong>プロジェクトメンバー</strong> - 初期メンバーの選択</li>
                </ul>
              </div>
              
              <h5>� プロジェクト作成の流れ</h5>
              <div className="w3-panel w3-light-grey w3-leftbar w3-border-grey w3-margin-bottom">
                <ol>
                  <li><strong>基本情報を入力</strong> - プロジェクト名、説明、期間を設定</li>
                  <li><strong>マネージャーを選択</strong> - 「マネージャーを選択」ボタンから責任者を選ぶ</li>
                  <li><strong>メンバーを追加</strong> - 必要に応じて初期メンバーを選択</li>
                  <li><strong>クライアント情報を入力</strong> - 連絡先や住所を登録</li>
                  <li><strong>「作成」ボタンをクリック</strong> - プロジェクトを作成</li>
                </ol>
              </div>
              
              <div className="w3-panel w3-light-green w3-leftbar w3-border-green">
                <p><strong>💡 作成後のヒント:</strong> プロジェクト作成後は「メンバー管理」ページで詳細な工数配分や参加期間の設定ができます。まずは基本情報を入力して作成しましょう！</p>
              </div>
            </div>
            
            <footer className="w3-container w3-padding w3-light-grey">
              <button 
                className="w3-button w3-blue w3-right"
                onClick={() => setShowHelp(false)}
              >
                閉じる
              </button>
              <div className="w3-clear"></div>
            </footer>
          </div>
        </div>
      )}

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
