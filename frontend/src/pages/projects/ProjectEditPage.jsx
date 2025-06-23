import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaQuestionCircle, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { usePageSkills } from '../../hooks/usePageSkills';
import { useSkillsRefresh } from '../../hooks/useSkillsRefresh';
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
  const [showHelp, setShowHelp] = useState(false);
  // ページ専用スキルデータ取得（マウント時にリフレッシュ）
  const {
    companySkills,
    defaultSkills,
    allSkills,
    skillStats,
    isLoading: pageSkillsLoading
  } = usePageSkills({ refreshOnMount: true, enableBackground: true });

  // スキルリフレッシュ機能
  const { refetchAllSkills } = useSkillsRefresh();
  // ページ読み込み時にスキルデータを確実に最新化（初回のみ）
  useEffect(() => {
    refetchAllSkills();
  }, []); // 依存配列を空にして初回マウント時のみ実行

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
      <div className="w3-white w3-margin-bottom">
        <header className="w3-container w3-blue w3-padding">
          <div className="w3-bar">
            <div className="w3-bar-item">
              <h2>プロジェクトを編集: {projectData?.name}</h2>
              <p>プロジェクトの情報を更新してください。</p>
            </div>
            <div className="w3-bar-item w3-right">
              <button
                className="w3-button w3-circle w3-white w3-text-blue w3-hover-light-grey"
                onClick={() => setShowHelp(true)}
                title="ヘルプ・プロジェクト情報"
              >
                <FaQuestionCircle />
              </button>
            </div>
          </div>
        </header>
      </div>      {/* プロジェクト編集フォーム */}
      <div className="w3-row">
        <div className="w3-col l12 m12">
          <ProjectForm
            project={projectData}
            onSubmit={(values, actions) => {
              updateProjectMutation.mutate(values);
            }}
            onCancel={() => navigate('/projects')}
            isSubmitting={updateProjectMutation.isPending || updateProjectMutation.isLoading}
            isPageMode={true} // ページモード
          />
        </div>      </div>

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
              <h3>📊 プロジェクト情報とヘルプ</h3>
            </header>
              <div className="w3-container w3-padding">
              <h5>📊 プロジェクト情報</h5>
              <div className="w3-panel w3-light-blue w3-leftbar w3-border-blue w3-margin-bottom">
                <div className="w3-row-padding">
                  <div className="w3-col s3">
                    <strong>作成日</strong><br />
                    <span className="w3-text-blue">{projectData?.createdAt ? new Date(projectData.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="w3-col s3">
                    <strong>最終更新</strong><br />
                    <span className="w3-text-green">{projectData?.updatedAt ? new Date(projectData.updatedAt).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="w3-col s3">
                    <strong>メンバー数</strong><br />
                    <span className="w3-text-orange">{projectData?.members ? projectData.members.length : 0} 人</span>
                  </div>
                  <div className="w3-col s3">
                    <strong>ステータス</strong><br />
                    <span className={`w3-tag w3-small ${
                      projectData?.status === 'IN_PROGRESS' ? 'w3-green' :
                      projectData?.status === 'COMPLETED' ? 'w3-blue' :
                      projectData?.status === 'PLANNED' ? 'w3-light-blue' : 'w3-orange'
                    }`}>
                      {projectData?.status === 'IN_PROGRESS' ? '進行中' :
                       projectData?.status === 'COMPLETED' ? '完了' :
                       projectData?.status === 'PLANNED' ? '計画中' : 'その他'}
                    </span>
                  </div>
                </div>
              </div>
              
              <h5>💡 プロジェクト編集のヒント</h5>
              <div className="w3-panel w3-light-green w3-leftbar w3-border-green w3-margin-bottom">
                <ul className="w3-ul">
                  <li><strong>基本情報の更新</strong> - プロジェクト名、説明、期間を変更可能</li>
                  <li><strong>クライアント情報</strong> - 連絡先や住所情報を管理</li>
                  <li><strong>チーム設定</strong> - マネージャーとメンバーの選択・変更</li>
                  <li><strong>ステータス管理</strong> - 計画中、進行中、完了などの進捗管理</li>
                </ul>
              </div>
              
              <h5>⚙️ 操作の流れ</h5>
              <div className="w3-panel w3-light-grey w3-leftbar w3-border-grey w3-margin-bottom">
                <ol>
                  <li><strong>情報を確認・更新</strong> - 各項目を必要に応じて変更</li>
                  <li><strong>チーム構成を調整</strong> - メンバーの追加・削除・変更</li>
                  <li><strong>「更新」ボタンをクリック</strong> - 変更内容を保存</li>
                  <li><strong>メンバー管理で詳細設定</strong> - 工数配分や期間設定</li>
                </ol>              </div>
              
              <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-yellow">
                <p><strong>� ヒント:</strong> 更新後はメンバー管理ページで詳細な工数配分や期間設定を行えます。</p>
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

export default ProjectEditPage;
