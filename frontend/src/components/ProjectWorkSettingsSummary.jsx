import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCog, FaClock, FaMapMarkerAlt, FaUsers, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import api from '../utils/axios';

const ProjectWorkSettingsSummary = ({ projectId }) => {
  // 勤務設定データの取得
  const { data: workSettingsData, isLoading, error } = useQuery({
    queryKey: ['projectWorkSettings', projectId],
    queryFn: async () => {
      const response = await api.get(`/project-work-settings/project/${projectId}/work-settings`);
      return response.data;
    },
    enabled: !!projectId
  });

  if (isLoading) {
    return (
      <div className="w3-center w3-padding">
        <i className="fa fa-spinner fa-spin"></i>
        <p className="w3-text-grey">勤務設定を読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w3-panel w3-red w3-leftbar">
        <p>勤務設定の読み込みに失敗しました。</p>
      </div>
    );
  }

  const workSettings = workSettingsData?.data?.workSettings || [];

  if (workSettings.length === 0) {
    return (
      <div className="w3-panel w3-pale-yellow w3-leftbar w3-border-orange">
        <div className="w3-row-padding">
          <div className="w3-col m1">
            <FaExclamationTriangle className="w3-large w3-text-orange" />
          </div>
          <div className="w3-col m11">
            <h5>勤務設定が未設定</h5>
            <p>このプロジェクトには勤務設定が作成されていません。プロジェクト詳細画面から勤務設定を作成してください。</p>
          </div>
        </div>
      </div>
    );
  }
  const totalAssignedUsers = workSettings.reduce((total, setting) => 
    total + (setting.userAssignments?.length || 0), 0
  );
  const totalHolidays = workSettings.reduce((total, setting) => 
    total + (setting.holidaySettings?.length || 0), 0
  );

  return (
    <div>
      {/* 統計サマリー */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col l3 m6 s12">
          <div className="w3-panel w3-blue w3-text-white w3-center w3-padding-small">
            <h4 className="w3-margin-top w3-margin-bottom">{workSettings.length}</h4>
            <small>設定数</small>
          </div>
        </div>
        <div className="w3-col l3 m6 s12">
          <div className="w3-panel w3-green w3-text-white w3-center w3-padding-small">
            <h4 className="w3-margin-top w3-margin-bottom">{totalAssignedUsers}</h4>
            <small>割り当てユーザー</small>
          </div>
        </div>
        <div className="w3-col l3 m6 s12">
          <div className="w3-panel w3-orange w3-text-white w3-center w3-padding-small">
            <h4 className="w3-margin-top w3-margin-bottom">{totalHolidays}</h4>
            <small>休日設定</small>
          </div>
        </div>
        <div className="w3-col l3 m6 s12">
          <div className="w3-panel w3-purple w3-text-white w3-center w3-padding-small">            <h4 className="w3-margin-top w3-margin-bottom">
              {workSettings.filter(s => s.userAssignments?.length > 0).length}
            </h4>
            <small>運用中設定</small>
          </div>
        </div>
      </div>

      {/* 設定詳細リスト */}
      <div className="w3-row-padding">
        {workSettings.map(setting => (
          <div key={setting.id} className="w3-col l6 m12 s12 w3-margin-bottom">
            <div className="w3-card w3-white w3-border w3-round">
              <header className="w3-container w3-indigo w3-padding-small">
                <h6 className="w3-margin-top w3-margin-bottom">
                  <FaCog className="w3-margin-right" />
                  {setting.name}
                </h6>
              </header>
              <div className="w3-container w3-padding-small">
                <div className="w3-small">
                  <div className="w3-row-padding">
                    <div className="w3-col s6">                      <p className="w3-margin-small">
                        <FaClock className="w3-margin-right w3-text-blue" />
                        {setting.workStartTime} - {setting.workEndTime}
                      </p>
                    </div>
                    <div className="w3-col s6">
                      <p className="w3-margin-small">
                        <FaMapMarkerAlt className="w3-margin-right w3-text-green" />
                        {setting.workLocation || '未設定'}
                      </p>
                    </div>
                  </div>
                  <div className="w3-row-padding">
                    <div className="w3-col s6">
                      <p className="w3-margin-small">
                        <strong>休憩:</strong> {setting.breakDuration}分
                      </p>
                    </div>
                    <div className="w3-col s6">
                      <p className="w3-margin-small">
                        <strong>週開始:</strong> {['日', '月', '火', '水', '木', '金', '土'][setting.weekStartDay || 1]}曜日
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="w3-margin-top">
                  <div className="w3-row-padding">
                    <div className="w3-col s4">                      <span className="w3-tag w3-blue w3-small w3-round">
                        <FaUsers className="w3-margin-right" />
                        {setting.userAssignments?.length || 0}
                      </span>
                    </div>
                    <div className="w3-col s4">
                      <span className="w3-tag w3-orange w3-small w3-round">
                        <FaCalendarAlt className="w3-margin-right" />
                        {setting.holidaySettings?.length || 0}
                      </span>
                    </div>
                    <div className="w3-col s4">
                      <span className={`w3-tag w3-small w3-round ${
                        setting.userAssignments?.length > 0 ? 'w3-green' : 'w3-grey'
                      }`}>
                        {setting.userAssignments?.length > 0 ? '運用中' : '未使用'}
                      </span>
                    </div>
                  </div>
                </div>                {/* 割り当てユーザー表示 */}
                {setting.userAssignments && setting.userAssignments.length > 0 && (
                  <div className="w3-margin-top w3-border-top w3-padding-small">
                    <div className="w3-tiny w3-text-grey">割り当てユーザー:</div>
                    <div className="w3-margin-top">
                      {setting.userAssignments.slice(0, 4).map(assignment => (
                        <span key={assignment.id} className="w3-tag w3-light-grey w3-tiny w3-margin-right w3-margin-bottom">
                          {assignment.user?.lastName} {assignment.user?.firstName}
                        </span>
                      ))}
                      {setting.userAssignments.length > 4 && (
                        <span className="w3-text-grey w3-tiny">
                          +{setting.userAssignments.length - 4}名
                        </span>
                      )}
                    </div>
                  </div>
                )}                {/* 最近の休日表示 */}
                {setting.holidaySettings && setting.holidaySettings.length > 0 && (
                  <div className="w3-margin-top w3-border-top w3-padding-small">
                    <div className="w3-tiny w3-text-grey">最近の休日:</div>
                    <div className="w3-margin-top">
                      {setting.holidaySettings
                        .slice(0, 3)
                        .map(holiday => (
                          <span key={holiday.id} className="w3-tag w3-light-blue w3-tiny w3-margin-right w3-margin-bottom">
                            {new Date(holiday.holidayDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                            {holiday.name && ` ${holiday.name}`}
                          </span>
                        ))}
                      {setting.holidaySettings.length > 3 && (
                        <span className="w3-text-grey w3-tiny">
                          +{setting.holidaySettings.length - 3}日
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectWorkSettingsSummary;
