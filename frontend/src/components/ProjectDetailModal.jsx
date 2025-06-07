import React from 'react';
import { FaBuilding, FaCalendarAlt, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import ProjectWorkHours from './ProjectWorkHours';

const ProjectDetailModal = ({ project, isOpen, onClose }) => {
  if (!isOpen || !project) return null;

  // デバッグ用：プロジェクトデータをログ出力
  console.log('ProjectDetailModal - project data:', {
    id: project.id,
    name: project.name,
    clientCompanyName: project.clientCompanyName,
    clientContactName: project.clientContactName,
    clientContactPhone: project.clientContactPhone,
    clientContactEmail: project.clientContactEmail,
    clientPrefecture: project.clientPrefecture,
    clientCity: project.clientCity,
    clientStreetAddress: project.clientStreetAddress
  });

  const formatDate = (dateString) => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { class: 'w3-green', text: '進行中' },
      COMPLETED: { class: 'w3-blue', text: '完了' },
      ON_HOLD: { class: 'w3-orange', text: '保留' },
      CANCELLED: { class: 'w3-red', text: 'キャンセル' }
    };
    
    const config = statusConfig[status] || { class: 'w3-grey', text: status };
    
    return (
      <span className={`w3-tag w3-round ${config.class}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-top" style={{ maxWidth: '90vw', margin: '0 auto' }}>
        <div className="w3-container w3-blue">
          <span 
            onClick={onClose}
            className="w3-button w3-blue w3-large w3-display-topright"
            style={{ cursor: 'pointer' }}
          >
            <FaTimes />
          </span>
          <h2>プロジェクト詳細</h2>
        </div>

        <div className="w3-container w3-padding">
          {/* プロジェクト基本情報 */}
          <div className="w3-section">
            <h3 className="w3-text-blue">基本情報</h3>
            <div className="w3-row-padding">
              <div className="w3-col l6 m6 s12">
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">プロジェクト名</label>
                  <div className="w3-text-black w3-large">
                    <strong>{project.name}</strong>
                  </div>
                </div>
              </div>
              <div className="w3-col l6 m6 s12">
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">ステータス</label>
                  <div className="w3-margin-top">
                    {getStatusBadge(project.status)}
                  </div>
                </div>
              </div>
            </div>

            {project.description && (
              <div className="w3-margin-bottom">
                <label className="w3-text-grey">説明</label>
                <div className="w3-text-black w3-border w3-padding w3-light-grey">
                  {project.description}
                </div>
              </div>
            )}

            <div className="w3-row-padding">
              <div className="w3-col l6 m6 s12">
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">開始日</label>
                  <div className="w3-text-black">
                    <FaCalendarAlt className="w3-margin-right w3-text-blue" />
                    {formatDate(project.startDate)}
                  </div>
                </div>
              </div>
              <div className="w3-col l6 m6 s12">
                <div className="w3-margin-bottom">
                  <label className="w3-text-grey">終了日</label>
                  <div className="w3-text-black">
                    <FaCalendarAlt className="w3-margin-right w3-text-blue" />
                    {formatDate(project.endDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* クライアント情報 */}
          {(project.clientCompanyName || project.clientContactName || project.clientContactPhone || project.clientContactEmail || project.clientPrefecture || project.clientCity || project.clientStreetAddress) && (
            <div className="w3-section w3-border-top w3-padding-top">
              <h3 className="w3-text-blue">
                <FaBuilding className="w3-margin-right" />
                クライアント情報
              </h3>
              
              {project.clientCompanyName && (
                <div className="w3-row-padding">
                  <div className="w3-col l12 m12 s12">
                    <div className="w3-margin-bottom">
                      <label className="w3-text-grey">企業名</label>
                      <div className="w3-text-black w3-large">
                        <strong>{project.clientCompanyName}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 担当者情報 */}
              {(project.clientContactName || project.clientContactPhone || project.clientContactEmail) && (
                <div className="w3-margin-top">
                  <h4 className="w3-text-dark-grey">
                    <FaUser className="w3-margin-right" />
                    担当者情報
                  </h4>
                  <div className="w3-row-padding">
                    {project.clientContactName && (
                      <div className="w3-col l4 m6 s12">
                        <div className="w3-margin-bottom">
                          <label className="w3-text-grey">担当者名</label>
                          <div className="w3-text-black">{project.clientContactName}</div>
                        </div>
                      </div>
                    )}
                    {project.clientContactPhone && (
                      <div className="w3-col l4 m6 s12">
                        <div className="w3-margin-bottom">
                          <label className="w3-text-grey">
                            <FaPhone className="w3-margin-right w3-text-green" />電話番号</label>
                          <div className="w3-text-black">
                            {project.clientContactPhone}
                          </div>
                        </div>
                      </div>
                    )}
                    {project.clientContactEmail && (
                      <div className="w3-col l4 m6 s12">
                        <div className="w3-margin-bottom">
                          <label className="w3-text-grey">
                            <FaEnvelope className="w3-margin-right w3-text-orange" />メールアドレス</label>
                          <div className="w3-text-black">
                            {project.clientContactEmail}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}              {/* 住所情報 */}
              {(project.clientPrefecture || project.clientCity || project.clientStreetAddress) && (
                <div className="w3-margin-top">
                  <h4 className="w3-text-dark-grey">
                    <FaMapMarkerAlt className="w3-margin-right" />
                    住所
                  </h4>
                  <div className="w3-text-black">
                    {project.clientPrefecture || ''}{project.clientCity || ''}{project.clientStreetAddress || ''}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w3-container w3-padding w3-border-top">
          <button 
            className="w3-button w3-blue w3-right"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
