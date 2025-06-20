import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { FaCalendarAlt, FaBuilding, FaUsers, FaEdit, FaArrowLeft, FaInfoCircle, FaQuestionCircle, FaTimes } from 'react-icons/fa';
import Breadcrumb from '../../components/common/Breadcrumb';
import api from '../../utils/axios';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  // 日付フォーマット関数
  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  // ステータス表示関数
  const getStatusBadge = (status) => {
    const statusConfig = {
      PLANNED: { class: 'w3-light-blue', text: '計画中' },
      IN_PROGRESS: { class: 'w3-green', text: '進行中' },
      COMPLETED: { class: 'w3-blue', text: '完了' },
      ON_HOLD: { class: 'w3-orange', text: '一時停止' }
    };
    
    const config = statusConfig[status] || { class: 'w3-grey', text: status };
    
    return (
      <span className={`w3-tag w3-round ${config.class}`}>
        {config.text}
      </span>
    );
  };

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
    staleTime: 30000, // 30秒間キャッシュ
  });

  // パンくずリストのアイテム
  const breadcrumbItems = [
    { label: 'プロジェクト管理', path: '/projects' },
    { label: projectData?.name ? `${projectData.name} の詳細` : 'プロジェクト詳細' }
  ];

  // ローディング状態
  if (projectLoading) {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-center w3-padding">
          <div className="w3-spinner w3-border w3-border-blue"></div>
          <p>プロジェクト詳細を読み込み中...</p>
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
          <p>プロジェクト詳細の読み込みに失敗しました。</p>
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
  const managers = projectData?.members?.filter(m => m.isManager) || [];
  const members = projectData?.members?.filter(m => !m.isManager) || [];

  return (
    <div className="w3-container w3-margin-top">
      {/* パンくずリスト */}
      <Breadcrumb items={breadcrumbItems} />
      
      {/* アクションボタン */}
      <div className="w3-bar w3-margin-bottom">
        <button
          className="w3-button w3-grey"
          onClick={() => navigate('/projects')}
        >
          <FaArrowLeft className="w3-margin-right" />
          プロジェクト一覧に戻る
        </button>
        
        {(currentUser?.role === 'ADMIN' || 
          currentUser?.role === 'COMPANY' || 
          currentUser?.role === 'MANAGER') && (
          <>
            <button
              className="w3-button w3-green w3-margin-left"
              onClick={() => navigate(`/projects/${id}/edit`)}
            >
              <FaEdit className="w3-margin-right" />
              プロジェクトを編集
            </button>
            
            <button
              className="w3-button w3-blue w3-margin-left"
              onClick={() => navigate(`/projects/${id}/members`)}
            >
              <FaUsers className="w3-margin-right" />
              メンバー管理
            </button>
          </>
        )}
      </div>

      <div className="w3-row">
        {/* メインコンテンツ */}
        <div className="w3-col l12 m12">
          {/* プロジェクト基本情報 */}
          <div className="w3-white w3-margin-bottom">            <header className="w3-container w3-blue w3-padding">
              <div className="w3-bar">
                <div className="w3-bar-item">
                  <h2>
                    <FaInfoCircle className="w3-margin-right" />
                    {projectData?.name}
                  </h2>
                  <div className="w3-bar">
                    {getStatusBadge(projectData?.status)}
                  </div>
                </div>
                <div className="w3-bar-item w3-right">
                  <button
                    className="w3-button w3-circle w3-white w3-text-blue w3-hover-light-grey"
                    onClick={() => setShowHelp(true)}
                    title="プロジェクト統計・ヘルプ"
                  >
                    <FaQuestionCircle />
                  </button>
                </div>
              </div>
            </header>
            
            <div className="w3-container w3-padding">
              {/* プロジェクト説明 */}
              {projectData?.description && (
                <div className="w3-section">
                  <h4 className="w3-text-blue">プロジェクト概要</h4>
                  <p className="w3-text-grey">{projectData.description}</p>
                </div>
              )}

              {/* 期間情報 */}
              <div className="w3-section">
                <h4 className="w3-text-blue">期間</h4>
                <div className="w3-row-padding">
                  <div className="w3-col m6">
                    <div className="w3-panel w3-light-grey">
                      <div className="w3-large">
                        <FaCalendarAlt className="w3-margin-right" />
                        開始日
                      </div>
                      <div className="w3-xlarge w3-text-blue">
                        {formatDate(projectData?.startDate)}
                      </div>
                    </div>
                  </div>
                  <div className="w3-col m6">
                    <div className="w3-panel w3-light-grey">
                      <div className="w3-large">
                        <FaCalendarAlt className="w3-margin-right" />
                        終了予定日
                      </div>
                      <div className="w3-xlarge w3-text-blue">
                        {formatDate(projectData?.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* クライアント情報 */}
          {(projectData?.clientCompanyName || 
            projectData?.clientContactName || 
            projectData?.clientContactEmail) && (
            <div className="w3-white w3-margin-bottom">
              <header className="w3-container w3-green w3-padding">
                <h3>
                  <FaBuilding className="w3-margin-right" />
                  クライアント情報
                </h3>
              </header>
              
              <div className="w3-container w3-padding">
                <div className="w3-row-padding">
                  {projectData?.clientCompanyName && (
                    <div className="w3-col m6">
                      <strong>企業名:</strong><br />
                      {projectData.clientCompanyName}
                    </div>
                  )}
                  
                  {projectData?.clientContactName && (
                    <div className="w3-col m6">
                      <strong>担当者:</strong><br />
                      {projectData.clientContactName}
                    </div>
                  )}
                  
                  {projectData?.clientContactEmail && (
                    <div className="w3-col m6">
                      <strong>メールアドレス:</strong><br />
                      <a href={`mailto:${projectData.clientContactEmail}`}>
                        {projectData.clientContactEmail}
                      </a>
                    </div>
                  )}
                  
                  {projectData?.clientContactPhone && (
                    <div className="w3-col m6">
                      <strong>電話番号:</strong><br />
                      {projectData.clientContactPhone}
                    </div>
                  )}
                </div>

                {(projectData?.clientPrefecture || 
                  projectData?.clientCity || 
                  projectData?.clientStreetAddress) && (
                  <div className="w3-section">
                    <strong>住所:</strong><br />
                    {[
                      projectData?.clientPrefecture,
                      projectData?.clientCity,
                      projectData?.clientStreetAddress
                    ].filter(Boolean).join(' ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* チーム構成 */}
          <div className="w3-white">
            <header className="w3-container w3-orange w3-padding">
              <h3>
                <FaUsers className="w3-margin-right" />
                チーム構成
              </h3>
            </header>
            
            <div className="w3-container w3-padding">
              {/* マネージャー */}
              <div className="w3-section">
                <h4 className="w3-text-blue">プロジェクトマネージャー ({managers.length}名)</h4>
                {managers.length > 0 ? (
                  <div className="w3-row-padding">
                    {managers.map((member, index) => (
                      <div key={index} className="w3-col m6 l4 w3-margin-bottom">
                        <div className="w3-panel w3-light-blue w3-round">
                          <div className="w3-large w3-text-blue">
                            {member.user.lastName} {member.user.firstName}
                          </div>
                          {member.user.position && (
                            <div className="w3-small w3-text-grey">
                              {member.user.position}
                            </div>
                          )}
                          {member.allocation && (
                            <div className="w3-small">
                              工数: {member.allocation}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="w3-text-grey">マネージャーが設定されていません</p>
                )}
              </div>

              {/* メンバー */}
              <div className="w3-section">
                <h4 className="w3-text-blue">プロジェクトメンバー ({members.length}名)</h4>
                {members.length > 0 ? (
                  <div className="w3-row-padding">
                    {members.map((member, index) => (
                      <div key={index} className="w3-col m6 l4 w3-margin-bottom">
                        <div className="w3-panel w3-light-grey w3-round">
                          <div className="w3-large">
                            {member.user.lastName} {member.user.firstName}
                          </div>
                          {member.user.position && (
                            <div className="w3-small w3-text-grey">
                              {member.user.position}
                            </div>
                          )}
                          {member.allocation && (
                            <div className="w3-small">
                              工数: {member.allocation}%
                            </div>
                          )}
                          {member.user.skills && member.user.skills.length > 0 && (
                            <div className="w3-margin-top">
                              {member.user.skills.slice(0, 3).map((skill, skillIndex) => (
                                <span key={skillIndex} className="w3-tag w3-tiny w3-blue w3-margin-right">
                                  {skill.globalSkill?.name || skill.name}
                                </span>
                              ))}
                              {member.user.skills.length > 3 && (
                                <span className="w3-text-grey w3-small">
                                  +{member.user.skills.length - 3}個
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="w3-text-grey">メンバーが設定されていません</p>
                )}
              </div>
            </div>
          </div>        </div>
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
              <h3>📊 プロジェクト統計</h3>
            </header>
              <div className="w3-container w3-padding">
              <h5>📊 プロジェクト統計情報</h5>
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
                    <strong>マネージャー</strong><br />
                    <span className="w3-large w3-text-blue">{managers.length} 人</span>
                  </div>
                  <div className="w3-col s3">
                    <strong>一般メンバー</strong><br />
                    <span className="w3-large w3-text-orange">{members.length} 人</span>
                  </div>
                </div>
                <div className="w3-center w3-margin-top">
                  <strong>総メンバー数: </strong>
                  <span className="w3-tag w3-large w3-green">{projectData?.members ? projectData.members.length : 0} 人</span>
                </div>
              </div>
              
              <h5>⚙️ 利用可能な操作</h5>
              <div className="w3-panel w3-light-green w3-leftbar w3-border-green w3-margin-bottom">
                <ul className="w3-ul">
                  <li><strong>プロジェクト編集</strong> - 「編集」ボタンで基本情報やチーム構成を変更</li>
                  <li><strong>メンバー管理</strong> - 「メンバー管理」ボタンで工数配分や期間設定</li>
                  <li><strong>ステータス変更</strong> - 編集画面でプロジェクトの進捗状況を更新</li>
                  <li><strong>メンバー情報確認</strong> - 各メンバーのスキルや役割を閲覧</li>
                </ul>
              </div>
              
              <h5>� プロジェクト管理のポイント</h5>
              <div className="w3-panel w3-light-grey w3-leftbar w3-border-grey w3-margin-bottom">
                <ol>
                  <li><strong>定期的な情報更新</strong> - プロジェクトの進捗に応じてステータスを更新</li>
                  <li><strong>適切な工数配分</strong> - メンバーの総工数が100%を超えないよう管理</li>
                  <li><strong>期間設定の活用</strong> - メンバーごとの参加期間を明確に設定</li>
                  <li><strong>チーム構成の最適化</strong> - 必要なスキルを持つメンバーを適切に配置</li>
                </ol>
              </div>
              
              <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-yellow">
                <p><strong>💡 ヒント:</strong> メンバー管理画面では工数配分や参加期間の詳細設定ができます。プロジェクトの効率的な運営のため、定期的にメンバー状況を確認しましょう。</p>
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
    </div>
  );
};

export default ProjectDetailPage;
