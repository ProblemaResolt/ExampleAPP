import React, { useState, useMemo } from 'react';
import { FaLightbulb, FaSync } from 'react-icons/fa';
import Snackbar from '../components/Snackbar';
import TabNavigation from '../components/common/TabNavigation';
import SearchFilter from '../components/common/SearchFilter';
import CompanySkillsList from '../components/skills/CompanySkillsList';
import AvailableSkillsList from '../components/skills/AvailableSkillsList';
import CustomSkillForm from '../components/skills/CustomSkillForm';
import { useSkills } from '../hooks/useSkills';

const Skills = () => {
  const [activeTab, setActiveTab] = useState('company'); // 会社タブを初期表示に変更
  const [snackbar, setSnackbar] = useState({
    isOpen: false,
    message: '',
    severity: 'info'
  });

  // スナックバー表示の関数
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ isOpen: true, message, severity });
  };

  // スナックバーを閉じる関数
  const closeSnackbar = () => {
    setSnackbar({ isOpen: false, message: '', severity: 'info' });
  };

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    customSkillForm,
    setCustomSkillForm,
    skillsData,
    availableSkillsData,
    groupedAvailableSkills,
    isLoading,
    isLoadingAvailable,
    addSkillToCompany,
    removeSkillFromCompany,
    createCustomSkill,    handleAddSkillToCompany,
    handleRemoveSkillFromCompany,
    handleCreateCustomSkill,
    handleCustomSkillFormChange,
    refetchData
  } = useSkills(showSnackbar);

  const tabs = [
    { id: 'company', label: '会社選択済みスキル' },
    { id: 'available', label: '規定のスキル' },
    { 
      id: 'custom', 
      label: '会社独自スキル・フレームワークの追加',
      icon: <FaLightbulb />
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleCustomFormSubmit = (formData) => {
    handleCreateCustomSkill(formData);
  };

  const handleCustomFormCancel = () => {
    setCustomSkillForm({ name: '', category: '', description: '' });
    setActiveTab('company');
  };  // デバッグ情報の表示（React.memoで最適化）
  const debugInfo = useMemo(() => (
    <div className="w3-panel w3-pale-yellow w3-border-yellow w3-margin-top">
      <h4>🔍 デバッグ情報 (Updated at {new Date().toLocaleTimeString()})</h4>
      <p><strong>会社選択済みスキル数:</strong> {Array.isArray(skillsData) ? skillsData.length : 'null/undefined'}</p>
      <p><strong>利用可能スキル数:</strong> {Array.isArray(availableSkillsData) ? availableSkillsData.length : 'null/undefined'}</p>
      <p><strong>ローディング状態:</strong> company: {isLoading ? 'YES' : 'NO'}, available: {isLoadingAvailable ? 'YES' : 'NO'}</p>
      <p><strong>mutation状態:</strong> 
        add: {addSkillToCompany.isPending ? 'PENDING' : addSkillToCompany.isError ? 'ERROR' : 'IDLE'}, 
        remove: {removeSkillFromCompany.isPending ? 'PENDING' : removeSkillFromCompany.isError ? 'ERROR' : 'IDLE'}
      </p>
      <p><strong>キャッシュ最適化:</strong> 有効（5分間キャッシュ + 楽観的更新）</p>
      {addSkillToCompany.error && (
        <p><strong>追加エラー:</strong> {addSkillToCompany.error.message}</p>
      )}
      {skillsData && skillsData.length > 0 && (
        <details>
          <summary>会社スキルデータサンプル</summary>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(skillsData[0], null, 2)}
          </pre>
        </details>
      )}
      {availableSkillsData && availableSkillsData.length > 0 && (
        <details>
          <summary>利用可能スキルデータサンプル</summary>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(availableSkillsData[0], null, 2)}
          </pre>
        </details>
      )}
    </div>
  ), [
    skillsData, 
    availableSkillsData, 
    isLoading, 
    isLoadingAvailable, 
    addSkillToCompany.isPending, 
    addSkillToCompany.isError,
    addSkillToCompany.error,
    removeSkillFromCompany.isPending, 
    removeSkillFromCompany.isError
  ]);

  // 一時的にローディングチェックを無効化してデバッグ情報を表示
  if (false && (isLoading || isLoadingAvailable)) {
    return (
      <div className="w3-container w3-padding-64">
        <div className="w3-center">
          <i className="fa fa-spinner fa-spin fa-3x"></i>
          <p>読み込み中...</p>
        </div>
      </div>
    );  }
  return (
    <div className="w3-container w3-padding">
      <div className="w3-card-4 w3-white">        <header className="w3-container w3-blue">
          <div className="w3-row">
            <div className="w3-col s10">
              <h2>スキル管理</h2>
            </div>
            <div className="w3-col s2 w3-right-align">
              <button
                className="w3-button w3-white w3-round w3-margin-top"
                onClick={refetchData}
                title="データを再読み込み"
              >
                <FaSync />
              </button>
            </div>
          </div>
        </header>

        <div className="w3-container w3-padding">

          {/* デバッグ情報表示 */}
          {debugInfo}

          {/* タブナビゲーション */}
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* 検索フィルター */}
          {activeTab !== 'custom' && (
            <SearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showCategoryFilter={activeTab === 'available'}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={Object.keys(groupedAvailableSkills)}
              placeholder="スキルを検索..."
              categoryPlaceholder="全カテゴリ"
            />
          )}          {/* コンテンツ */}
          {activeTab === 'company' && (
            <CompanySkillsList
              skills={skillsData}
              searchQuery={searchQuery}
              onRemoveSkill={handleRemoveSkillFromCompany}
              isLoading={removeSkillFromCompany.isPending}
            />
          )}

          {activeTab === 'available' && (
            <AvailableSkillsList
              skills={availableSkillsData}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onAddSkill={handleAddSkillToCompany}
              isLoading={addSkillToCompany.isPending}
            />
          )}          {activeTab === 'custom' && (
            <CustomSkillForm
              formData={customSkillForm}
              onFormChange={handleCustomSkillFormChange}
              onSubmit={handleCustomFormSubmit}
              onCancel={handleCustomFormCancel}
              isLoading={createCustomSkill.isPending}
            />
          )}

        </div>
      </div>
      
      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={closeSnackbar}
        duration={4000}
      />
    </div>
  );
};

export default Skills;
