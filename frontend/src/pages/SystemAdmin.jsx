import React, { useState, useEffect, useMemo } from 'react';
import {
  FaPlus,
  FaEdit,
  FaUsers,
  FaBuilding,
  FaUserShield,
  FaUserTie,
  FaBan,
  FaCheck,
  FaEnvelope,
  FaSpinner,
  FaTrash,
  FaTachometerAlt,
  FaChartBar,
  FaHistory,
  FaShieldAlt,
  FaCog,
  FaGlobe,
  FaServer,
  FaDatabase,
  FaExclamationTriangle,
  FaChartLine,
  FaClipboardList,
  FaKey,
  FaLock,
  FaEye,
  FaUser
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

// バリデーションスキーマ
const userSchema = yup.object({
  firstName: yup.string().required('名前（名）は必須です'),
  lastName: yup.string().required('名前（姓）は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  role: yup.string().required('ロールは必須です'),
  companyId: yup.string().nullable(),
  position: yup.string().nullable()
});

// ロールの表示名マッピング
const roleLabels = {
  ADMIN: 'システム管理者',
  COMPANY: '管理者',
  MANAGER: 'マネージャー',
  MEMBER: 'メンバー'
};

// ロールのアイコンコンポーネント
const RoleIcon = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return <FaUserShield />;
    case 'COMPANY':
      return <FaBuilding />;
    case 'MANAGER':
      return <FaUserTie />;
    default:
      return <FaUser />;
  }
};

// ユーザー編集ダイアログ
const UserDialog = ({ open, onClose, user, onSubmit, formik, companies }) => {
  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '600px', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <h3>{user ? 'ユーザーを編集' : 'ユーザーを追加'}</h3>
        </header>
        <form onSubmit={onSubmit}>
          <div className="w3-container">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>名前（名）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.firstName && formik.errors.firstName ? 'w3-border-red' : ''}`}
                  name="firstName"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="w3-text-red">{formik.errors.firstName}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>名前（姓）</label>
                <input
                  className={`w3-input w3-border ${formik.touched.lastName && formik.errors.lastName ? 'w3-border-red' : ''}`}
                  name="lastName"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="w3-text-red">{formik.errors.lastName}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>メールアドレス</label>
                <input
                  className={`w3-input w3-border ${formik.touched.email && formik.errors.email ? 'w3-border-red' : ''}`}
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className="w3-text-red">{formik.errors.email}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>ロール</label>
                <select
                  className={`w3-select w3-border ${formik.touched.role && formik.errors.role ? 'w3-border-red' : ''}`}
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  <option value="ADMIN">システム管理者</option>
                  <option value="COMPANY">管理者</option>
                </select>
                {formik.touched.role && formik.errors.role && (
                  <div className="w3-text-red">{formik.errors.role}</div>
                )}
                <div className="w3-text-grey w3-small w3-margin-top">
                  <strong>注意:</strong> セキュリティ上の理由により、システム管理者はマネージャー・メンバーアカウントを直接作成できません。
                </div>
              </div>
              <div className="w3-col m6">
                <label>会社</label>
                <select
                  className="w3-select w3-border"
                  name="companyId"
                  value={formik.values.companyId}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  {companies?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w3-col m12">
                <label>役職</label>
                <input
                  className="w3-input w3-border"
                  name="position"
                  value={formik.values.position}
                  onChange={formik.handleChange}
                />
              </div>
            </div>
          </div>
          <footer className="w3-container w3-padding">
            <button type="button" className="w3-button w3-gray" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="w3-button w3-blue w3-right"
              disabled={formik.isSubmitting}
            >
              {user ? '更新' : '作成'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

const SystemAdmin = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // debounced search query - 500ms待ってから検索実行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ADMIN権限チェック
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaExclamationTriangle className="w3-xxlarge w3-text-red" />
        <h3 className="w3-text-red">アクセス拒否</h3>
        <p>この機能はシステム管理者専用です。</p>
      </div>
    );
  }

  // システム統計の取得
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.data;
    }
  });

  // 監査ログの取得
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['auditLogs', page, rowsPerPage],
    queryFn: async () => {
      const response = await api.get('/admin/audit-logs', {
        params: {
          page: page + 1,
          limit: rowsPerPage
        }
      });
      return response.data.data;
    }
  });

  // ユーザー一覧の取得（すべての会社のユーザー）
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['allUsers', page, rowsPerPage, orderBy, order, debouncedSearchQuery, filters],
    queryFn: async () => {
      const response = await api.get('/admin/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sort: `${orderBy}:${order}`,
          search: debouncedSearchQuery,
          ...filters
        }
      });
      return response.data.data;
    },
    enabled: activeTab === 'users'
  });

  // 全会社一覧の取得
  const { data: companiesData } = useQuery({
    queryKey: ['allCompanies'],
    queryFn: async () => {
      const response = await api.get('/admin/companies');
      return response.data.data;
    },
    enabled: activeTab === 'companies'
  });

  // ユーザーの作成/更新（管理者権限）
  const saveUser = useMutation({
    mutationFn: async (values) => {
      const userData = {
        ...values,
        role: values.role.toUpperCase(),
        companyId: values.companyId || null,
        position: values.position || null
      };
      
      if (selectedUser) {
        const { data } = await api.patch(`/api/admin/users/${selectedUser.id}`, userData);
        return data;
      } else {
        const { data } = await api.post('/admin/users', userData);
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setSuccess(selectedUser ? 'ユーザーを更新しました' : 'ユーザーを作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      if (error.response?.data?.error?.errors) {
        const validationErrors = error.response.data.error.errors;
        const errorMessages = validationErrors.map(err => {
          const field = err.param;
          const message = err.msg;
          const value = error.response.data.error.requestBody?.[field];
          return `${field}: ${message} (値: ${value})`;
        }).join('\n');
        setError(`バリデーションエラー:\n${errorMessages}`);
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || '操作に失敗しました';
        setError(errorMessage);
      }
      setSuccess('');
    }
  });

  // ユーザーのステータス変更（管理者権限）
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const { data } = await api.patch(`/api/admin/users/${userId}`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setSuccess('ユーザーのステータスを更新しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'ステータスの更新に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // ユーザー削除（管理者権限）
  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      const { data } = await api.delete(`/api/admin/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      setSuccess('ユーザーを削除しました');
      setError('');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'ユーザーの削除に失敗しました';
      setError(errorMessage);
      setSuccess('');
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      companyId: '',
      position: ''
    },
    validationSchema: userSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await saveUser.mutateAsync(values);
      } catch (error) {
        // Error handling is done in saveUser.mutate
      } finally {
        setSubmitting(false);
      }
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (user = null) => {
    setSelectedUser(user);
    if (user) {
      formik.setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.company?.id || '',
        position: user.position || ''
      });
    } else {
      formik.resetForm({
        values: {
          firstName: '',
          lastName: '',
          email: '',
          role: '',
          companyId: '',
          position: ''
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    formik.resetForm();
  };

  // システム統計のダッシュボード
  const renderDashboard = () => (
    <div className="w3-row-padding">
      <div className="w3-col l3 m6 s12">
        <div className="w3-card w3-blue w3-text-white w3-padding">
          <div className="w3-row">
            <div className="w3-col s8">
              <h3>{systemStats?.totalUsers || 0}</h3>
              <p>総ユーザー数</p>
            </div>
            <div className="w3-col s4 w3-center">
              <FaUsers className="w3-xxxlarge" />
            </div>
          </div>
        </div>
      </div>
      <div className="w3-col l3 m6 s12">
        <div className="w3-card w3-green w3-text-white w3-padding">
          <div className="w3-row">
            <div className="w3-col s8">
              <h3>{systemStats?.totalCompanies || 0}</h3>
              <p>総会社数</p>
            </div>
            <div className="w3-col s4 w3-center">
              <FaBuilding className="w3-xxxlarge" />
            </div>
          </div>
        </div>
      </div>
      <div className="w3-col l3 m6 s12">
        <div className="w3-card w3-orange w3-text-white w3-padding">
          <div className="w3-row">
            <div className="w3-col s8">
              <h3>{systemStats?.activeProjects || 0}</h3>
              <p>アクティブプロジェクト</p>
            </div>
            <div className="w3-col s4 w3-center">
              <FaClipboardList className="w3-xxxlarge" />
            </div>
          </div>
        </div>
      </div>
      <div className="w3-col l3 m6 s12">
        <div className="w3-card w3-red w3-text-white w3-padding">
          <div className="w3-row">
            <div className="w3-col s8">
              <h3>{systemStats?.systemAlerts || 0}</h3>
              <p>システムアラート</p>
            </div>
            <div className="w3-col s4 w3-center">
              <FaExclamationTriangle className="w3-xxxlarge" />
            </div>
          </div>
        </div>
      </div>

      <div className="w3-col l6 m12 s12 w3-margin-top">
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-gray">
            <h5><FaChartLine style={{ marginRight: '8px' }} />システム利用状況</h5>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col s6">
                <p><strong>今日のログイン:</strong> {systemStats?.todayLogins || 0}</p>
                <p><strong>今週のログイン:</strong> {systemStats?.weekLogins || 0}</p>
              </div>
              <div className="w3-col s6">
                <p><strong>アクティブユーザー:</strong> {systemStats?.activeUsers || 0}</p>
                <p><strong>新規ユーザー（今月）:</strong> {systemStats?.newUsersThisMonth || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w3-col l6 m12 s12 w3-margin-top">
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-gray">
            <h5><FaServer style={{ marginRight: '8px' }} />システム情報</h5>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col s6">
                <p><strong>サーバー稼働時間:</strong> {systemStats?.uptime || 'N/A'}</p>
                <p><strong>データベース接続:</strong> <span className="w3-text-green">正常</span></p>
              </div>
              <div className="w3-col s6">
                <p><strong>最終バックアップ:</strong> {systemStats?.lastBackup || 'N/A'}</p>
                <p><strong>システムバージョン:</strong> v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 監査ログの表示
  const renderAuditLogs = () => (
    <div>
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m6">
          <input
            className="w3-input w3-border"
            type="text"
            placeholder="ログを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>日時</th>
              <th>ユーザー</th>
              <th>アクション</th>
              <th>リソース</th>
              <th>IPアドレス</th>
              <th>結果</th>
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr>
                <td colSpan="6" className="w3-center">
                  <FaSpinner className="fa-spin" /> ロード中...
                </td>
              </tr>
            ) : (
              auditLogs?.logs?.map((log) => (
                <tr key={log.id} className="w3-hover-light-gray">
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.user?.lastName} {log.user?.firstName}</td>
                  <td>
                    <span className={`w3-tag ${log.action === 'CREATE' ? 'w3-green' : log.action === 'UPDATE' ? 'w3-blue' : log.action === 'DELETE' ? 'w3-red' : 'w3-gray'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.resource}</td>
                  <td>{log.ipAddress}</td>
                  <td>
                    <span className={`w3-tag ${log.success ? 'w3-green' : 'w3-red'}`}>
                      {log.success ? '成功' : '失敗'}
                    </span>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="6" className="w3-center w3-text-gray">
                    監査ログはありません
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // セキュリティ設定画面
  const renderSecuritySettings = () => (
    <div className="w3-row-padding">
      <div className="w3-col l6 m12 s12">
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-gray">
            <h5><FaLock style={{ marginRight: '8px' }} />パスワードポリシー</h5>
          </header>
          <div className="w3-container w3-padding">
            <p>
              <label>
                <input className="w3-check" type="checkbox" defaultChecked />
                <span>最小8文字以上</span>
              </label>
            </p>
            <p>
              <label>
                <input className="w3-check" type="checkbox" defaultChecked />
                <span>大文字・小文字を含む</span>
              </label>
            </p>
            <p>
              <label>
                <input className="w3-check" type="checkbox" defaultChecked />
                <span>数字を含む</span>
              </label>
            </p>
            <p>
              <label>
                <input className="w3-check" type="checkbox" />
                <span>特殊文字を含む</span>
              </label>
            </p>
            <button className="w3-button w3-blue">設定を保存</button>
          </div>
        </div>
      </div>

      <div className="w3-col l6 m12 s12">
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-gray">
            <h5><FaKey style={{ marginRight: '8px' }} />セッション設定</h5>
          </header>
          <div className="w3-container w3-padding">
            <p>
              <label>セッションタイムアウト（分）</label>
              <input className="w3-input w3-border" type="number" defaultValue="60" />
            </p>
            <p>
              <label>
                <input className="w3-check" type="checkbox" defaultChecked />
                <span>ログイン失敗時のアカウントロック</span>
              </label>
            </p>
            <p>
              <label>最大ログイン試行回数</label>
              <input className="w3-input w3-border" type="number" defaultValue="5" />
            </p>
            <button className="w3-button w3-blue">設定を保存</button>
          </div>
        </div>
      </div>

      <div className="w3-col l12 m12 s12 w3-margin-top">
        <div className="w3-card w3-white">
          <header className="w3-container w3-light-gray">
            <h5><FaShieldAlt style={{ marginRight: '8px' }} />システムアクセス制御</h5>
          </header>
          <div className="w3-container w3-padding">
            <div className="w3-row-padding">
              <div className="w3-col m4">
                <p>
                  <label>
                    <input className="w3-check" type="checkbox" defaultChecked />
                    <span>二要素認証の強制</span>
                  </label>
                </p>
              </div>
              <div className="w3-col m4">
                <p>
                  <label>
                    <input className="w3-check" type="checkbox" defaultChecked />
                    <span>IPアドレス制限</span>
                  </label>
                </p>
              </div>
              <div className="w3-col m4">
                <p>
                  <label>
                    <input className="w3-check" type="checkbox" />
                    <span>API レート制限</span>
                  </label>
                </p>
              </div>
            </div>
            <button className="w3-button w3-blue">設定を保存</button>
          </div>
        </div>
      </div>
    </div>
  );

  // 会社管理表示（基本情報のみ）
  const renderCompanyManagement = () => (
    <div>
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m12">
          <div className="w3-panel w3-blue w3-round">
            <h4>🔒 制限された表示</h4>
            <p>セキュリティ上の理由により、システム管理者は会社の基本情報のみ表示できます。</p>
          </div>
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>会社名</th>
              <th>説明</th>
              <th>ウェブサイト</th>
              <th>作成日</th>
            </tr>
          </thead>
          <tbody>
            {companiesData?.companies?.length > 0 ? (
              companiesData.companies.map((company) => (
                <tr key={company.id} className="w3-hover-light-gray">
                  <td>
                    <div className="w3-cell-row">
                      <div className="w3-cell" style={{ width: '40px' }}>
                        <FaBuilding />
                      </div>
                      <div className="w3-cell">
                        <strong>{company.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{company.description || '-'}</td>
                  <td>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="w3-text-blue">
                        {company.website}
                      </a>
                    ) : '-'}
                  </td>
                  <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="w3-center">
                  会社データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="w3-margin-top">
        <div className="w3-panel w3-yellow w3-round w3-small">
          <p><strong>注意:</strong> 住所、連絡先情報、従業員詳細などの機密情報はセキュリティ上の理由により表示されません。</p>
        </div>
      </div>
    </div>
  );

  // ユーザー管理テーブルの表示
  const renderUserManagement = () => (
    <div>
      <div className="w3-bar w3-margin-bottom">
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => handleOpenDialog()}
        >
          <FaPlus style={{ marginRight: '8px' }} /> ユーザーを追加
        </button>
      </div>

      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m6">
          <input
            className="w3-input w3-border"
            type="text"
            placeholder="ユーザーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
          >
            <option value="">すべてのロール</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
          </select>
        </div>
      </div>

      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th>メールアドレス</th>
              <th>ロール</th>
              <th>会社</th>
              <th>ステータス</th>
              <th>作成日</th>
              <th>編集</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="w3-center">
                  <FaSpinner className="fa-spin" /> ロード中...
                </td>
              </tr>
            ) : (
              usersData?.users?.map((user) => (
                <tr key={user.id} className="w3-hover-light-gray">
                  <td>
                    <div className="w3-cell-row">
                      <div className="w3-cell" style={{ width: '40px' }}>
                        <RoleIcon role={user.role} />
                      </div>
                      <div className="w3-cell">
                        <FaEnvelope style={{ marginRight: '8px' }} />
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`w3-tag ${user.role === 'ADMIN' ? 'w3-red' : user.role === 'COMPANY' ? 'w3-blue' : user.role === 'MANAGER' ? 'w3-green' : 'w3-gray'}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td>{user.company?.name || '-'}</td>
                  <td>
                    <span className={`w3-tag ${user.isActive ? 'w3-green' : 'w3-red'}`}>
                      {user.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="w3-bar">
                      <button
                        className="w3-button w3-small w3-blue"
                        onClick={() => handleOpenDialog(user)}
                        title="ユーザー編集"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className={`w3-button w3-small ${user.isActive ? 'w3-red' : 'w3-green'}`}
                        onClick={() => updateUserStatus.mutate({ userId: user.id, isActive: !user.isActive })}
                        title={user.isActive ? '非アクティブ化' : 'アクティブ化'}
                      >
                        {user.isActive ? <FaBan /> : <FaCheck />}
                      </button>
                      <button
                        className="w3-button w3-small w3-red"
                        onClick={() => {
                          if (window.confirm('このユーザーを削除しますか？この操作は取り消せません。')) {
                            deleteUser.mutate(user.id);
                          }
                        }}
                        title="ユーザー削除"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="9" className="w3-center w3-text-gray">
                    ユーザーはありません
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {usersData?.pagination && (
        <div className="w3-bar w3-center w3-margin-top">
          <button
            className="w3-button w3-bar-item"
            onClick={() => setPage(0)}
            disabled={page === 0}
          >
            &laquo;
          </button>
          <button
            className="w3-button w3-bar-item"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            &lsaquo;
          </button>
          <span className="w3-bar-item w3-padding">
            {page + 1} / {Math.ceil((usersData.pagination.total || 0) / rowsPerPage)}
          </span>
          <button
            className="w3-button w3-bar-item"
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * rowsPerPage >= (usersData.pagination.total || 0)}
          >
            &rsaquo;
          </button>
          <button
            className="w3-button w3-bar-item"
            onClick={() => setPage(Math.ceil((usersData.pagination.total || 0) / rowsPerPage) - 1)}
            disabled={(page + 1) * rowsPerPage >= (usersData.pagination.total || 0)}
          >
            &raquo;
          </button>
          <select
            className="w3-select w3-bar-item"
            style={{ width: 'auto' }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          >
            {[5, 10, 25, 50].map(size => (
              <option key={size} value={size}>{size}件表示</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  if (statsLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container">
      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">システム管理</h2>
      </div>

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="w3-panel w3-green">
          <p>{success}</p>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="w3-bar w3-light-gray w3-margin-bottom">
        <button
          className={`w3-button w3-bar-item ${activeTab === 'dashboard' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <FaTachometerAlt style={{ marginRight: '8px' }} />
          ダッシュボード
        </button>
        <button
          className={`w3-button w3-bar-item ${activeTab === 'users' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers style={{ marginRight: '8px' }} />
          ユーザー管理
        </button>
        <button
          className={`w3-button w3-bar-item ${activeTab === 'companies' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          <FaBuilding style={{ marginRight: '8px' }} />
          会社管理
        </button>
        <button
          className={`w3-button w3-bar-item ${activeTab === 'audit' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <FaHistory style={{ marginRight: '8px' }} />
          監査ログ
        </button>
        <button
          className={`w3-button w3-bar-item ${activeTab === 'security' ? 'w3-blue' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <FaShieldAlt style={{ marginRight: '8px' }} />
          セキュリティ
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="w3-margin-top">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'companies' && renderCompanyManagement()}
        {activeTab === 'audit' && renderAuditLogs()}
        {activeTab === 'security' && renderSecuritySettings()}
      </div>

      <UserDialog
        open={openDialog}
        onClose={handleCloseDialog}
        user={selectedUser}
        onSubmit={formik.handleSubmit}
        formik={formik}
        companies={companiesData}
      />
    </div>
  );
};
export default SystemAdmin;