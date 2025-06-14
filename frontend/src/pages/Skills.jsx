import React, { useState } from 'react';
import { FaLightbulb } from 'react-icons/fa';
import Snackbar from '../components/Snackbar';
import TabNavigation from '../components/common/TabNavigation';
import SearchFilter from '../components/common/SearchFilter';
import CompanySkillsList from '../components/skills/CompanySkillsList';
import AvailableSkillsList from '../components/skills/AvailableSkillsList';
import CustomSkillForm from '../components/skills/CustomSkillForm';
import { useSkills } from '../hooks/useSkills';

const Skills = () => {
  const [activeTab, setActiveTab] = useState('available'); // デバッグ用: availableタブを初期表示
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
    createCustomSkill,
    handleAddSkillToCompany,
    handleRemoveSkillFromCompany,
    handleCreateCustomSkill,
    handleCustomSkillFormChange
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
  };  // 一時的にローディングチェックを無効化してデバッグ情報を表示
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
      <div className="w3-card-4 w3-white">
        <header className="w3-container w3-blue">
          <h2>スキル管理</h2>
        </header>

        <div className="w3-container w3-padding">

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
