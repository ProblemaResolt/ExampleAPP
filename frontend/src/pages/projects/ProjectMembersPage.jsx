import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../hooks/useSnackbar';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaArrowLeft, FaCog, FaCalendarAlt } from 'react-icons/fa';
import AddMemberDialog from '../../components/AddMemberDialog';
import ProjectMemberPeriodDialog from '../../components/ProjectMemberPeriodDialog';
import ProjectMemberAllocationDialog from '../../components/ProjectMemberAllocationDialog';
import Breadcrumb from '../../components/common/Breadcrumb';
import Snackbar from '../../components/Snackbar';
import api from '../../utils/axios';

const ProjectMembersPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddManagerDialog, setShowAddManagerDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);

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
    staleTime: 10000, // 10秒間キャッシュ
  });

  // メンバー追加のミューテーション
  const addMemberMutation = useMutation({
    mutationFn: async ({ projectId, userIds, isManager }) => {
      return api.post(`/projects/${projectId}/members`, { userIds, isManager });
    },
    onSuccess: () => {
      showSuccess('メンバーを追加しました');
      queryClient.invalidateQueries(['project', id]);
      setShowAddMemberDialog(false);
      setShowAddManagerDialog(false);
    },
    onError: (error) => {
      showError('メンバーの追加に失敗しました');
    }
  });

  // メンバー削除のミューテーション
  const removeMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberId }) => {
      return api.delete(`/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      showSuccess('メンバーを削除しました');
      queryClient.invalidateQueries(['project', id]);
    },
    onError: (error) => {
      showError('メンバーの削除に失敗しました');
    }
  });

  // 期間更新のミューテーション
  const updatePeriodMutation = useMutation({
    mutationFn: async ({ projectId, memberId, startDate, endDate }) => {
      // より一般的なAPIエンドポイントを試す
      return api.patch(`/projects/${projectId}/members/${memberId}`, {
        startDate,
        endDate
      });
    },
    onSuccess: () => {
      showSuccess('参加期間を更新しました');
      queryClient.invalidateQueries(['project', id]);
      setPeriodDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      showError('参加期間の更新に失敗しました');
    }
  });

  // 工数配分更新のミューテーション
  const updateAllocationMutation = useMutation({
    mutationFn: async ({ projectId, memberId, allocation }) => {
      return api.patch(`/projects/${projectId}/members/${memberId}/allocation`, {
        allocation
      });
    },
    onSuccess: () => {
      showSuccess('工数配分を更新しました');
      // プロジェクトデータを強制的に再取得
      queryClient.invalidateQueries(['project', id]);
      queryClient.refetchQueries(['project', id]);
      setAllocationDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      showError('工数配分の更新に失敗しました');
    }
  });

  // パンくずリストのアイテム
  const breadcrumbItems = [
    { label: 'プロジェクト管理', path: '/projects' },
    { label: projectData?.name || 'プロジェクト', path: `/projects/${id}` },
    { label: 'メンバー管理' }
  ];

  // メモ化されたコールバック関数（Hooksの順序を保つため、条件分岐より前に定義）
  const handleAddMembers = useCallback((selectedMembers) => {
    // selectedMembersからuserIdを抽出
    const userIds = selectedMembers.map(member => member.id);
    const isManager = false; // 通常メンバーとして追加
    
    addMemberMutation.mutate({
      projectId: id,
      userIds,
      isManager
    });
  }, [addMemberMutation, id]);

  const handleAddManagers = useCallback((selectedMembers) => {
    // selectedMembersからuserIdを抽出
    const userIds = selectedMembers.map(member => member.id);
    const isManager = true; // マネージャーとして追加
    
    addMemberMutation.mutate({
      projectId: id,
      userIds,
      isManager
    });
  }, [addMemberMutation, id]);
  // メンバーの総工数計算関数（全プロジェクトを考慮）
  const calculateMemberTotalAllocation = useCallback((userId) => {
    if (!projectData?.members) return 0;
    
    // 現在のプロジェクトからそのメンバーの工数を取得
    const membershipInCurrentProject = projectData.members.find(m => m.user.id === userId);
    if (membershipInCurrentProject) {
      // 既存メンバーの場合、totalAllocationを返す（既に計算済み）
      return membershipInCurrentProject.totalAllocation || membershipInCurrentProject.allocation || 0;
    }
    
    // 新規メンバーの場合は0を返す
    return 0;
  }, [projectData]);

  const handleUpdatePeriod = useCallback((startDate, endDate) => {
    if (selectedMember) {
      updatePeriodMutation.mutate({
        projectId: id,
        memberId: selectedMember.user.id,
        startDate,
        endDate      });
    }
  }, [updatePeriodMutation, id, selectedMember]);

  const handleUpdateAllocation = useCallback((values) => {
    if (selectedMember) {
      updateAllocationMutation.mutate({
        projectId: id,
        memberId: selectedMember.user.id,
        allocation: values.allocation
      });
    }
  }, [updateAllocationMutation, id, selectedMember]);

  // 権限チェック
  if (currentUser?.role === 'MEMBER') {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>アクセス権限がありません</h3>
          <p>プロジェクトメンバーの管理権限がありません。</p>
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
          <p>プロジェクトメンバー情報を読み込み中...</p>
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
          <p>プロジェクトメンバー情報の読み込みに失敗しました。</p>
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
      </div>

      <div className="w3-row">
        {/* メインコンテンツ */}
        <div className="w3-col l8 m12">
          {/* プロジェクト情報ヘッダー */}
          <div className="w3-card-4 w3-white w3-margin-bottom">
            <header className="w3-container w3-blue w3-padding">
              <h2>
                <FaUsers className="w3-margin-right" />
                メンバー管理: {projectData?.name}
              </h2>
              <p>プロジェクトメンバーの追加、削除、設定変更ができます。</p>
            </header>
          </div>          {/* マネージャー一覧 */}
          <div className="w3-card-4 w3-white w3-margin-bottom">
            <header className="w3-container w3-blue w3-padding">
              <div className="w3-bar">
                <h3 className="w3-bar-item">プロジェクトマネージャー ({managers.length}名)</h3>
                <div className="w3-bar-item w3-right">
                  <button
                    className="w3-button w3-blue w3-border w3-border-white"
                    onClick={() => setShowAddManagerDialog(true)}
                  >
                    <FaPlus className="w3-margin-right" />
                    マネージャーを選択
                  </button>
                </div>
              </div>
            </header>
            
            <div className="w3-container w3-padding">
              {managers.length > 0 ? (
                <div className="w3-responsive">
                  <table className="w3-table w3-bordered w3-striped">
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>役職</th>
                        <th>スキル</th>
                        <th>工数配分</th>
                        <th>開始日</th>
                        <th>終了日</th>
                        <th>アクション</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map((member, index) => (
                        <tr key={index}>
                          <td>
                            <div className="w3-large w3-text-blue">
                              {member.user.lastName} {member.user.firstName}
                            </div>
                            {member.user.email && (
                              <div className="w3-small w3-text-grey">
                                {member.user.email}
                              </div>
                            )}
                          </td>
                          <td>
                            {member.user.position || '-'}
                          </td>
                          <td>
                            {member.user.skills && member.user.skills.length > 0 ? (
                              <div>
                                {member.user.skills.slice(0, 2).map((skill, skillIndex) => (
                                  <span key={skillIndex} className="w3-tag w3-tiny w3-blue w3-margin-right">
                                    {skill.globalSkill?.name || skill.name}
                                  </span>
                                ))}
                                {member.user.skills.length > 2 && (
                                  <span className="w3-text-grey w3-small">
                                    +{member.user.skills.length - 2}個
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="w3-text-grey">-</span>
                            )}
                          </td>                          <td>                            <button
                              className="w3-button w3-small w3-light-blue"
                              onClick={() => {
                                setSelectedMember(member);
                                setSelectedProject(projectData);
                                setAllocationDialogOpen(true);
                              }}
                              title="工数配分を編集"
                            >
                              {Math.round((member.allocation || 0) * 100)}%
                            </button>
                          </td>
                          <td>
                            <div className="w3-small">
                              {member.startDate ? new Date(member.startDate).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="w3-small">
                              {member.endDate ? new Date(member.endDate).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="w3-bar">
                              <button
                                className="w3-button w3-small w3-green w3-margin-right"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedProject(projectData);
                                  setPeriodDialogOpen(true);
                                }}
                                title="参加期間を編集"
                              >
                                <FaCalendarAlt />
                              </button>
                              <button
                                className="w3-button w3-small w3-red"
                                onClick={() => {
                                  if (confirm(`${member.user.lastName} ${member.user.firstName}をプロジェクトから削除しますか？`)) {
                                    removeMemberMutation.mutate({
                                      projectId: id,
                                      memberId: member.user.id
                                    });
                                  }
                                }}
                                disabled={removeMemberMutation.isPending}
                                title="メンバーを削除"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w3-panel w3-light-grey w3-center">
                  <p>マネージャーが設定されていません</p>
                </div>
              )}
            </div>
          </div>          {/* メンバー一覧 */}
          <div className="w3-card-4 w3-white">
            <header className="w3-container w3-green w3-padding">
              <div className="w3-bar">
                <h3 className="w3-bar-item">プロジェクトメンバー ({members.length}名)</h3>
                <div className="w3-bar-item w3-right">
                  <button
                    className="w3-button w3-green w3-border w3-border-white"
                    onClick={() => setShowAddMemberDialog(true)}
                  >
                    <FaPlus className="w3-margin-right" />
                    メンバーを追加
                  </button>
                </div>
              </div>
            </header>
            
            <div className="w3-container w3-padding">
              {members.length > 0 ? (
                <div className="w3-responsive">
                  <table className="w3-table w3-bordered w3-striped">
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>役職</th>
                        <th>スキル</th>
                        <th>工数配分</th>
                        <th>開始日</th>
                        <th>終了日</th>
                        <th>アクション</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => (
                        <tr key={index}>
                          <td>
                            <div className="w3-large">
                              {member.user.lastName} {member.user.firstName}
                            </div>
                            {member.user.email && (
                              <div className="w3-small w3-text-grey">
                                {member.user.email}
                              </div>
                            )}
                          </td>
                          <td>
                            {member.user.position || '-'}
                          </td>
                          <td>
                            {member.user.skills && member.user.skills.length > 0 ? (
                              <div>
                                {member.user.skills.slice(0, 2).map((skill, skillIndex) => (
                                  <span key={skillIndex} className="w3-tag w3-tiny w3-green w3-margin-right">
                                    {skill.globalSkill?.name || skill.name}
                                  </span>
                                ))}
                                {member.user.skills.length > 2 && (
                                  <span className="w3-text-grey w3-small">
                                    +{member.user.skills.length - 2}個
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="w3-text-grey">-</span>
                            )}
                          </td>
                          <td>
                            <button                              className="w3-button w3-small w3-light-green"
                              onClick={() => {
                                setSelectedMember(member);
                                setSelectedProject(projectData);
                                setAllocationDialogOpen(true);
                              }}
                              title="工数配分を編集"
                            >
                              {Math.round((member.allocation || 0) * 100)}%
                            </button>
                          </td>
                          <td>
                            <div className="w3-small">
                              {member.startDate ? new Date(member.startDate).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="w3-small">
                              {member.endDate ? new Date(member.endDate).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td>
                            <div className="w3-bar">
                              <button
                                className="w3-button w3-small w3-green w3-margin-right"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setSelectedProject(projectData);
                                  setPeriodDialogOpen(true);
                                }}
                                title="参加期間を編集"
                              >
                                <FaCalendarAlt />
                              </button>
                              <button
                                className="w3-button w3-small w3-red"
                                onClick={() => {
                                  if (confirm(`${member.user.lastName} ${member.user.firstName}をプロジェクトから削除しますか？`)) {
                                    removeMemberMutation.mutate({
                                      projectId: id,
                                      memberId: member.user.id
                                    });
                                  }
                                }}
                                disabled={removeMemberMutation.isPending}
                                title="メンバーを削除"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w3-panel w3-light-grey w3-center">
                  <p>メンバーが設定されていません</p>
                  <p className="w3-text-grey w3-small">
                    上部の「メンバーを追加」ボタンからメンバーを追加できます
                  </p>
                </div>
              )}            </div>
          </div>
        </div>
        
        {/* サイドバー */}
        <div className="w3-col l4 m12">
          <div className="w3-card-4 w3-white w3-margin-left">
            <header className="w3-container w3-light-grey">
              <h4>💡 メンバー管理のヒント</h4>
            </header>
            <div className="w3-container w3-padding">
              <h5>メンバー追加</h5>
              <ul className="w3-ul">
                <li>右下のボタンからメンバーを追加</li>
                <li>スキルフィルタで適切な人材を検索</li>
                <li>工数配分を考慮して選択</li>
                <li>プロジェクトの期間を確認</li>
              </ul>
              
              <h5>メンバー管理</h5>
              <ul className="w3-ul">
                <li>工数配分の調整</li>
                <li>参加期間の設定</li>
                <li>ロールの変更（マネージャー/メンバー）</li>
              </ul>
              
              <div className="w3-panel w3-light-blue">
                <p><strong>💡 Tip:</strong> メンバーの工数は100%を上限として管理されます。</p>
              </div>
              
              <div className="w3-panel w3-light-green">
                <h5>📊 プロジェクト統計</h5>
                <div className="w3-margin-bottom">
                  <strong>総メンバー数:</strong><br />
                  {projectData?.members ? projectData.members.length : 0} 人
                </div>
                
                <div className="w3-margin-bottom">
                  <strong>マネージャー:</strong><br />
                  {managers.length} 人
                </div>
                
                <div className="w3-margin-bottom">
                  <strong>一般メンバー:</strong><br />
                  {members.length} 人
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      {/* マネージャー追加ダイアログ */}
      {showAddManagerDialog && (
        <AddMemberDialog
          open={showAddManagerDialog}
          onClose={() => setShowAddManagerDialog(false)}
          project={projectData}
          onSubmit={handleAddManagers}
          roleFilter={['COMPANY', 'MANAGER']}
          title="マネージャーを選択"
          calculateTotalAllocation={calculateMemberTotalAllocation}
        />
      )}

      {/* メンバー追加ダイアログ */}
      {showAddMemberDialog && (
        <AddMemberDialog
          open={showAddMemberDialog}
          onClose={() => setShowAddMemberDialog(false)}
          project={projectData}
          onSubmit={handleAddMembers}
          roleFilter={['MEMBER']}
          title="メンバーを追加"
          calculateTotalAllocation={calculateMemberTotalAllocation}
        />
      )}

      {/* 期間設定ダイアログ */}
      {periodDialogOpen && selectedMember && (
        <ProjectMemberPeriodDialog
          open={periodDialogOpen}
          onClose={() => {
            setPeriodDialogOpen(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          project={selectedProject}
          onSubmit={handleUpdatePeriod}
        />
      )}

      {/* 工数配分ダイアログ */}
      {allocationDialogOpen && selectedMember && (        <ProjectMemberAllocationDialog
          open={allocationDialogOpen}
          onClose={() => {
            setAllocationDialogOpen(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          project={selectedProject}
          onSave={handleUpdateAllocation}
        />
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

export default ProjectMembersPage;
