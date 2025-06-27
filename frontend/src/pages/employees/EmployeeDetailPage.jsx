import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaCalendar, FaArrowLeft, FaEdit, FaSpinner } from 'react-icons/fa';
import api from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumb from '../../components/common/Breadcrumb';

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

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // 社員データ取得
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const response = await api.get(`/users/${id}`, {
        params: { include: 'skills' }
      });
      return response.data.data || response.data;
    },
    enabled: Boolean(id),
    staleTime: 0
  });

  // パンくずリスト
  const breadcrumbItems = [
    { label: '社員管理', path: '/employees' },
    { label: employee ? `${employee.lastName} ${employee.firstName} の詳細` : '従業員詳細情報' }
  ];

  // ローディング状態
  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
        <p>読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="w3-container w3-margin-top">
        <Breadcrumb items={breadcrumbItems} />
        <div className="w3-panel w3-red w3-card">
          <h3>エラー</h3>
          <p>社員情報の読み込みに失敗しました。</p>
          <button
            className="w3-button w3-white"
            onClick={() => navigate('/employees')}
          >
            社員管理に戻る
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
              <h2>
                <FaUser className="w3-margin-right" />
                従業員詳細情報: {employee?.lastName} {employee?.firstName}
              </h2>
              <p>社員の詳細情報を確認できます。</p>
            </div>
          </div>
        </header>
      </div>

      {/* アクションボタン */}
      <div className="w3-bar w3-margin-bottom">
        <button
          className="w3-button w3-grey"
          onClick={() => navigate('/employees')}
        >
          <FaArrowLeft className="w3-margin-right" />
          社員管理に戻る
        </button>
        
        {/* 編集権限がある場合のみ編集ボタンを表示 */}
        {(currentUser?.role === 'COMPANY' || currentUser?.role === 'ADMIN') && (
          <button
            className="w3-button w3-blue w3-margin-left"
            onClick={() => navigate(`/employees/${id}/edit`)}
          >
            <FaEdit className="w3-margin-right" />
            編集
          </button>
        )}
      </div>

      <div className="w3-row">
        <div className="w3-col l12 m12">
          {/* 基本情報 */}
          <div className="w3-white w3-margin-bottom">
            <header className="w3-container w3-light-gray">
              <h4>基本情報</h4>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>名前:</strong><br/>
                    <span className="w3-large">{employee?.lastName} {employee?.firstName}</span>
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>メールアドレス:</strong><br/>
                    <FaEnvelope className="w3-margin-right" />
                    {employee?.email}
                  </p>
                </div>
              </div>
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>電話番号:</strong><br/>
                    <FaPhone className="w3-margin-right" />
                    {employee?.phone || '未設定'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>住所:</strong><br/>
                    <FaMapMarkerAlt className="w3-margin-right" />
                    {employee?.prefecture || employee?.city || employee?.streetAddress 
                      ? `${employee?.prefecture || ''}${employee?.city || ''}${employee?.streetAddress || ''}`.trim()
                      : '未設定'
                    }
                  </p>
                </div>
              </div>
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>役職:</strong><br/>
                    {employee?.position || '未設定'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>ロール:</strong><br/>
                    <span className={`w3-tag ${roleColors[employee?.role]}`}>
                      {roleLabels[employee?.role]}
                    </span>
                  </p>
                </div>
              </div>
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>アカウント状態:</strong><br/>
                    <span className={`w3-tag ${employee?.isActive ? 'w3-green' : 'w3-red'}`}>
                      {employee?.isActive ? '有効' : '無効'}
                    </span>
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>メール認証状態:</strong><br/>
                    <span className={`w3-tag ${employee?.isEmailVerified ? 'w3-green' : 'w3-orange'}`}>
                      {employee?.isEmailVerified ? '認証済み' : '未認証'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="w3-white w3-margin-bottom">
            <header className="w3-container w3-light-gray">
              <h4>アカウント情報</h4>
            </header>
            <div className="w3-container w3-padding">
              <div className="w3-row-padding">
                <div className="w3-col m6">
                  <p>
                    <strong>アカウント作成日:</strong><br/>
                    <FaCalendar className="w3-margin-right" />
                    {employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString('ja-JP') : '不明'}
                  </p>
                </div>
                <div className="w3-col m6">
                  <p>
                    <strong>最終ログイン:</strong><br/>
                    <FaClock className="w3-margin-right" />
                    {employee?.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString('ja-JP') : 'ログイン履歴なし'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* スキル情報 */}
          <div className="w3-white w3-margin-bottom">
            <header className="w3-container w3-light-gray">
              <h4>スキル情報</h4>
            </header>
            <div className="w3-container w3-padding">
              {employee?.userSkills && employee.userSkills.length > 0 ? (
                <div className="w3-row-padding">
                  {employee.userSkills.map((userSkill, index) => {
                    // スキル情報の取得（複数の可能な構造に対応）
                    const skillData = userSkill.companySelectedSkill?.globalSkill || 
                                     userSkill.companySelectedSkill || 
                                     userSkill.skill || 
                                     userSkill;
                    
                    const skillName = skillData?.skillName || skillData?.name || '不明なスキル';
                    const category = skillData?.category || '';
                    
                    return (
                      <div key={index} className="w3-col l4 m6 s12 w3-margin-bottom">
                        <div className="w3-card w3-border">
                          <div className="w3-container w3-light-blue">
                            <h5>{skillName}</h5>
                            {category && (
                              <span className="w3-tag w3-small w3-white w3-text-blue">
                                {category}
                              </span>
                            )}
                          </div>
                          <div className="w3-container w3-padding">
                            <p>
                              <strong>経験年数:</strong> {userSkill.years || 0} 年
                            </p>
                            {userSkill.level && (
                              <p>
                                <strong>レベル:</strong> {userSkill.level}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="w3-text-grey">登録されているスキルがありません。</p>
              )}
            </div>
          </div>

          {/* プロジェクト参加情報 */}
          {employee?.projectMemberships && employee.projectMemberships.length > 0 && (
            <div className="w3-white w3-margin-bottom">
              <header className="w3-container w3-light-gray">
                <h4>参加プロジェクト</h4>
              </header>
              <div className="w3-container w3-padding">
                <div className="w3-responsive">
                  <table className="w3-table w3-striped w3-bordered">
                    <thead>
                      <tr className="w3-blue">
                        <th>プロジェクト名</th>
                        <th>役割</th>
                        <th>工数配分</th>
                        <th>参加期間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.projectMemberships.map((membership, index) => (
                        <tr key={index}>
                          <td>{membership.project?.name || '不明'}</td>
                          <td>
                            <span className={`w3-tag w3-small ${membership.isManager ? 'w3-orange' : 'w3-blue'}`}>
                              {membership.isManager ? 'マネージャー' : 'メンバー'}
                            </span>
                          </td>
                          <td>{membership.allocation || 0}%</td>
                          <td>
                            {membership.startDate ? new Date(membership.startDate).toLocaleDateString('ja-JP') : '未設定'} 
                            ～ 
                            {membership.endDate ? new Date(membership.endDate).toLocaleDateString('ja-JP') : '未設定'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;
