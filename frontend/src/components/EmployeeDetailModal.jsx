import React from 'react';
import { FaUser, FaEnvelope, FaBuilding, FaClock, FaCalendar, FaTimes } from 'react-icons/fa';

const EmployeeDetailModal = ({ open, onClose, employee }) => {
  if (!open || !employee) return null;

// ロールの表示名マッピング
const roleLabels = {
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー',
  COMPANY: '管理者'
};

// ロールの色マッピング
const roleColors = {
  MANAGER: 'w3-orange',
  MEMBER: 'w3-blue',
  COMPANY: 'w3-red'
};

  return (
    <div className="w3-modal" style={{ display: "block" }}>
      <div
        className="w3-modal-content w3-card-4 w3-animate-zoom"
        style={{ maxWidth: "700px", margin: "0 auto" }}
      >
        <header className="w3-container w3-blue">
          <span
            className="w3-button w3-display-topright w3-large"
            onClick={onClose}
          >
            <FaTimes />
          </span>
          <h3>
            <FaUser className="w3-margin-right" />
            従業員詳細情報
          </h3>
        </header>

        <div className="w3-container w3-padding">
          {/* 基本情報 */}
          <div className="w3-card-4 w3-margin-bottom">
            <header className="w3-container w3-light-gray">
              <h5>基本情報</h5>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>名前:</strong><br/>
                    <span className="w3-large">{employee.firstName} {employee.lastName}</span>
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>メールアドレス:</strong><br/>
                    <FaEnvelope className="w3-margin-right" />
                    {employee.email}
                  </p>
                </div>
              </div>
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>役職:</strong><br/>
                    {employee.position || '未設定'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>ロール:</strong><br/>
                    <span className={`w3-tag ${roleColors[employee.role]}`}>
                      {roleLabels[employee.role]}
                    </span>
                  </p>
                </div>
              </div>
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>所属会社:</strong><br/>
                    <FaBuilding className="w3-margin-right" />
                    {employee.company?.name || '未設定'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>アカウント状態:</strong><br/>
                    <span className={`w3-tag ${employee.isActive ? 'w3-green' : 'w3-red'}`}>
                      {employee.isActive ? '有効' : '無効'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* スキル情報 */}
          <div className="w3-card-4 w3-margin-bottom">
            <header className="w3-container w3-light-gray">
              <h5>スキルセット</h5>
            </header>
            <div className="w3-container w3-padding">              {employee.skills && employee.skills.length > 0 ? (
                <div className="w3-row-padding">
                  {employee.skills.map(skill => (
                    <div key={skill.id} className="w3-col l4 m6 s12 w3-margin-bottom">
                      <div className="w3-card w3-light-blue w3-padding-small">
                        <div className="w3-center">
                          <div className="w3-text-white w3-large">
                            <strong>{skill.name}</strong>
                          </div>
                          <div className="w3-text-white">
                            経験年数: {skill.years || 0}年
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="w3-text-gray">スキルが設定されていません</p>
              )}
            </div>
          </div>

          {/* アクティビティ情報 */}
          <div className="w3-card-4">
            <header className="w3-container w3-light-gray">
              <h5>アクティビティ</h5>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <FaClock className="w3-margin-right w3-text-blue" />
                    <strong>最終ログイン:</strong><br/>
                    {employee.lastLoginAt
                      ? new Date(employee.lastLoginAt).toLocaleString()
                      : '未ログイン'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <FaCalendar className="w3-margin-right w3-text-green" />
                    <strong>登録日:</strong><br/>
                    {new Date(employee.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="w3-container w3-border-top w3-padding-16 w3-light-grey">
          <button
            className="w3-button w3-blue w3-round-large w3-right"
            onClick={onClose}
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;
