import React, { useState } from 'react';
import { FaCog, FaUsers, FaProjectDiagram, FaBriefcase } from 'react-icons/fa';
import ProjectWorkSettingsManagement from './ProjectWorkSettingsManagement';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

const WorkSettingsIntegratedManagement = () => {
  const { user } = useAuth();
  
  // ユーザーが参加しているプロジェクト一覧を取得
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/projects', {
        params: {
          include: ['members', 'company']
        }
      });
      return data;
    },
    enabled: !!user?.id
  });

  return (
    <div className="w3-container">
      <div className="w3-card w3-white">
        <header className="w3-container w3-blue">
          <h3>
            <FaBriefcase className="w3-margin-right" />
            プロジェクト勤務設定管理
          </h3>
          <p>プロジェクトごとの個人勤務設定を管理</p>
        </header>

        <div className="w3-container w3-padding">
          {/* 説明パネル */}
          <div className="w3-panel w3-pale-blue w3-border-blue w3-margin-bottom">
            <h4>
              <FaCog className="w3-margin-right" />
              プロジェクト勤務設定について
            </h4>
            <ul className="w3-ul w3-small">
              <li>各プロジェクトで<strong>規定の勤務時間</strong>を設定できます</li>
              <li>プロジェクトごとに異なる勤務時間・休憩時間を設定可能です</li>
              <li>設定した時間に基づいて勤怠管理が行われます</li>
              <li>既存の設定がある場合は編集、ない場合は新規作成となります</li>
            </ul>
          </div>          {/* プロジェクト勤務設定セクション */}
          <div className="w3-margin-top">
            {projectsLoading ? (
              <div className="w3-center w3-padding">
                <i className="fa fa-spinner fa-spin w3-large"></i>
                <p>プロジェクト情報を読み込み中...</p>
              </div>
            ) : (
              <div>
                {projectsData?.data?.projects && projectsData.data.projects.length > 0 ? (
                  <div>
                    <div className="w3-row w3-margin-bottom">
                      <div className="w3-col s12">
                        <h5>
                          <FaProjectDiagram className="w3-margin-right" />
                          参加プロジェクト一覧（{projectsData.data.projects.length}件）
                        </h5>
                        <p className="w3-text-grey w3-small">
                          各プロジェクトであなたの個人勤務設定を管理できます。プロジェクトごとに異なる勤務時間を設定可能です。
                        </p>
                      </div>
                    </div>
                    
                    {/* 各プロジェクトの勤務設定管理 */}
                    {projectsData.data.projects.map((project, index) => (
                      <div key={project.id} className="w3-margin-bottom">
                        <div className="w3-card w3-white w3-border w3-border-grey w3-round">
                          <header className={`w3-container w3-padding ${index % 2 === 0 ? 'w3-pale-green' : 'w3-pale-blue'}`}>
                            <h5>
                              <FaProjectDiagram className="w3-margin-right" />
                              {project.name}
                            </h5>
                            <p className="w3-small w3-margin-bottom-0">
                              このプロジェクトでのあなたの勤務設定を管理
                            </p>
                          </header>
                          <div className="w3-container w3-padding">
                            <ProjectWorkSettingsManagement
                              projectId={project.id}
                              projectName={project.name}
                              currentUser={user}
                              showHeader={false}
                              personalMode={true}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w3-panel w3-pale-yellow w3-border-yellow">
                    <h5>
                      <FaProjectDiagram className="w3-margin-right" />
                      参加プロジェクトがありません
                    </h5>
                    <p>現在、参加しているプロジェクトがありません。</p>
                    <p>プロジェクトに参加すると、ここでプロジェクトごとの勤務設定を管理できます。</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkSettingsIntegratedManagement;
