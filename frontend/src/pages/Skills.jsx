import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';
import api from '../utils/axios';

const Skills = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [editingSkill, setEditingSkill] = useState(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  // スキル一覧の取得
  const { data: skillsData, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await api.get('/api/users/skills');
      return response.data.data.skills;
    }
  });

  // スキル作成
  const createSkill = useMutation({
    mutationFn: async (name) => {
      const response = await api.post('/api/users/skills', { name });
      return response.data.data.skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skills']);
      setNewSkillName('');
    },
    onError: (error) => {
      alert('スキルの作成に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });

  // スキル更新（仮のAPI - 実装が必要）
  const updateSkill = useMutation({
    mutationFn: async ({ id, name }) => {
      const response = await api.patch(`/api/users/skills/${id}`, { name });
      return response.data.data.skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skills']);
      setEditingSkill(null);
      setEditName('');
    },
    onError: (error) => {
      alert('スキルの更新に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });

  // スキル削除（仮のAPI - 実装が必要）
  const deleteSkill = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/users/skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skills']);
    },
    onError: (error) => {
      alert('スキルの削除に失敗しました: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleCreateSkill = () => {
    if (!newSkillName.trim()) return;
    createSkill.mutate(newSkillName.trim());
  };

  const handleUpdateSkill = () => {
    if (!editName.trim() || !editingSkill) return;
    updateSkill.mutate({ id: editingSkill.id, name: editName.trim() });
  };

  const handleDeleteSkill = (skill) => {
    if (window.confirm(`「${skill.name}」を削除してもよろしいですか？`)) {
      deleteSkill.mutate(skill.id);
    }
  };

  const startEdit = (skill) => {
    setEditingSkill(skill);
    setEditName(skill.name);
  };

  const cancelEdit = () => {
    setEditingSkill(null);
    setEditName('');
  };

  // フィルタリング
  const filteredSkills = (skillsData || []).filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w3-container w3-padding-64">
        <div className="w3-center">
          <i className="fa fa-spinner fa-spin fa-3x"></i>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container w3-padding">
      <div className="w3-card-4 w3-white">
        <header className="w3-container w3-blue">
          <h2>スキル管理</h2>
        </header>

        <div className="w3-container w3-padding">
          {/* 新規スキル追加 */}
          <div className="w3-card w3-light-grey w3-padding w3-margin-bottom">
            <h4>新しいスキルを追加</h4>
            <div className="w3-row">
              <div className="w3-col m9">
                <input
                  className="w3-input w3-border"
                  type="text"
                  placeholder="スキル名を入力"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateSkill();
                    }
                  }}
                />
              </div>
              <div className="w3-col m3">
                <button
                  className="w3-button w3-blue w3-block"
                  onClick={handleCreateSkill}
                  disabled={createSkill.isPending || !newSkillName.trim()}
                >
                  <FaPlus className="w3-margin-right" />
                  {createSkill.isPending ? '作成中...' : '追加'}
                </button>
              </div>
            </div>
          </div>

          {/* 検索 */}
          <div className="w3-margin-bottom">
            <div className="w3-input-group">
              <input
                className="w3-input w3-border"
                type="text"
                placeholder="スキルを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="w3-input-group-btn">
                <button className="w3-button w3-blue">
                  <FaSearch />
                </button>
              </span>
            </div>
          </div>

          {/* スキル一覧 */}
          <div className="w3-responsive">
            <table className="w3-table w3-striped w3-bordered">
              <thead>
                <tr className="w3-blue">
                  <th>スキル名</th>
                  <th>使用者数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map((skill) => (
                  <tr key={skill.id} className="w3-hover-light-gray">
                    <td>
                      {editingSkill?.id === skill.id ? (
                        <input
                          className="w3-input w3-border"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateSkill();
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        skill.name
                      )}
                    </td>
                    <td>
                      <span className="w3-tag w3-light-blue">
                        {skill._count?.userSkills || 0}人
                      </span>
                    </td>
                    <td>
                      {editingSkill?.id === skill.id ? (
                        <div className="w3-bar">
                          <button
                            className="w3-button w3-small w3-green"
                            onClick={handleUpdateSkill}
                            disabled={updateSkill.isPending}
                          >
                            保存
                          </button>
                          <button
                            className="w3-button w3-small w3-gray w3-margin-left"
                            onClick={cancelEdit}
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <div className="w3-bar">
                          <button
                            className="w3-button w3-small w3-blue"
                            onClick={() => startEdit(skill)}
                            title="編集"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="w3-button w3-small w3-red w3-margin-left"
                            onClick={() => handleDeleteSkill(skill)}
                            title="削除"
                            disabled={deleteSkill.isPending}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSkills.length === 0 && (
                  <tr>
                    <td colSpan="3" className="w3-center w3-text-gray">
                      {searchQuery ? '該当するスキルがありません' : 'スキルが登録されていません'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skills;
