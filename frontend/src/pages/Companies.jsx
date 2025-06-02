import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { 
  FaSpinner, 
  FaPlus, 
  FaSearch, 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaUsers, 
  FaEdit, 
  FaTrash,
  FaBan,
  FaCheck
} from 'react-icons/fa';
import api from '../utils/axios';

// バリデーションスキーマ
const companySchema = yup.object({
  name: yup.string().required('会社名は必須です'),
  email: yup.string().email('有効なメールアドレスを入力してください').required('メールアドレスは必須です'),
  phone: yup.string().matches(/^\+?[1-9]\d{1,14}$/, '有効な電話番号を入力してください'),
  address: yup.string(),
  website: yup.string().url('有効なURLを入力してください'),
  subscriptionPlan: yup.string().required('サブスクリプションプランは必須です'),
  maxUsers: yup.number().min(1, '1以上の数を入力してください').required('最大ユーザー数は必須です')
});

// サブスクリプションプランの表示名マッピング
const planLabels = {
  free: 'フリープラン',
  basic: 'ベーシックプラン',
  premium: 'プレミアムプラン',
  enterprise: 'エンタープライズプラン'
};

// プランの色マッピング
const planColors = {
  free: 'w3-gray',
  basic: 'w3-blue',
  premium: 'w3-orange',
  enterprise: 'w3-red'
};

// 会社編集ダイアログ
const CompanyDialog = ({ open, onClose, company, onSubmit, formik }) => {
  if (!open) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-card-4 w3-animate-zoom" style={{ maxWidth: '800px' }}>
        <header className="w3-container w3-blue">
          <h3>{company ? '会社を編集' : '会社を追加'}</h3>
        </header>
        <form onSubmit={onSubmit}>
          <div className="w3-container">
            <div className="w3-row-padding">
              <div className="w3-col m6">
                <label>会社名</label>
                <input
                  className={`w3-input w3-border ${formik.touched.name && formik.errors.name ? 'w3-border-red' : ''}`}
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                />
                {formik.touched.name && formik.errors.name && (
                  <div className="w3-text-red">{formik.errors.name}</div>
                )}
              </div>
              <div className="w3-col m6">
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
                <label>電話番号</label>
                <input
                  className={`w3-input w3-border ${formik.touched.phone && formik.errors.phone ? 'w3-border-red' : ''}`}
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                />
                {formik.touched.phone && formik.errors.phone && (
                  <div className="w3-text-red">{formik.errors.phone}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>ウェブサイト</label>
                <input
                  className={`w3-input w3-border ${formik.touched.website && formik.errors.website ? 'w3-border-red' : ''}`}
                  name="website"
                  value={formik.values.website}
                  onChange={formik.handleChange}
                />
                {formik.touched.website && formik.errors.website && (
                  <div className="w3-text-red">{formik.errors.website}</div>
                )}
              </div>
              <div className="w3-col m12">
                <label>住所</label>
                <textarea
                  className="w3-input w3-border"
                  name="address"
                  rows="2"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                />
              </div>
              <div className="w3-col m6">
                <label>サブスクリプションプラン</label>
                <select
                  className={`w3-select w3-border ${formik.touched.subscriptionPlan && formik.errors.subscriptionPlan ? 'w3-border-red' : ''}`}
                  name="subscriptionPlan"
                  value={formik.values.subscriptionPlan}
                  onChange={formik.handleChange}
                >
                  <option value="">選択してください</option>
                  {Object.entries(planLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {formik.touched.subscriptionPlan && formik.errors.subscriptionPlan && (
                  <div className="w3-text-red">{formik.errors.subscriptionPlan}</div>
                )}
              </div>
              <div className="w3-col m6">
                <label>最大ユーザー数</label>
                <input
                  className={`w3-input w3-border ${formik.touched.maxUsers && formik.errors.maxUsers ? 'w3-border-red' : ''}`}
                  type="number"
                  name="maxUsers"
                  min="1"
                  value={formik.values.maxUsers}
                  onChange={formik.handleChange}
                />
                {formik.touched.maxUsers && formik.errors.maxUsers && (
                  <div className="w3-text-red">{formik.errors.maxUsers}</div>
                )}
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
              {company ? '更新' : '作成'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

const Companies = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    plan: '',
    status: ''
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // 会社一覧の取得
  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, rowsPerPage, orderBy, order, searchQuery, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        sort: `${orderBy}:${order}`,
        search: searchQuery,
        ...filters,
        include: 'users'
      });
      const { data } = await api.get(`/companies?${params}`);
      return data;
    }
  });

  // 会社の作成/更新
  const saveCompany = useMutation({
    mutationFn: async (values) => {
      if (selectedCompany) {
        const { data } = await api.put(`/companies/${selectedCompany.id}`, values);
        return data;
      } else {
        const { data } = await api.post('/companies', values);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess(selectedCompany ? '会社情報を更新しました' : '会社を作成しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      setError(error.response?.data?.message || '操作に失敗しました');
      setSuccess('');
    }
  });

  // 会社の削除
  const deleteCompany = useMutation({
    mutationFn: async (companyId) => {
      const { data } = await api.delete(`/companies/${companyId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess('会社を削除しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || '会社の削除に失敗しました');
      setSuccess('');
    }
  });

  // 会社のステータス変更
  const updateCompanyStatus = useMutation({
    mutationFn: async ({ companyId, status }) => {
      const { data } = await api.put(`/companies/${companyId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies']);
      setSuccess('会社のステータスを更新しました');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'ステータスの更新に失敗しました');
      setSuccess('');
    }
  });

  // フォーム
  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      subscriptionPlan: '',
      maxUsers: 5
    },
    validationSchema: companySchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await saveCompany.mutateAsync(values);
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (company = null) => {
    setSelectedCompany(company);
    if (company) {
      formik.setValues({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
        subscriptionPlan: company.subscription?.plan || '',
        maxUsers: company.subscription?.maxUsers || 5
      });
    } else {
      formik.resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCompany(null);
    formik.resetForm();
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (isLoading) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container">
      <div className="w3-bar w3-margin-bottom">
        <h2 className="w3-bar-item">会社管理</h2>
        <button
          className="w3-button w3-blue w3-right"
          onClick={() => handleOpenDialog()}
        >
          <FaPlus /> 会社を追加
        </button>
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

      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col m6">
          <div className="w3-input-group">
            <input
              className="w3-input w3-border"
              type="text"
              placeholder="会社を検索..."
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
        <div className="w3-col m3">
          <select
            className="w3-select w3-border"
            value={filters.plan}
            onChange={(e) => setFilters(prev => ({ ...prev, plan: e.target.value }))}
          >
            <option value="">すべてのプラン</option>
            {Object.entries(planLabels).map(([value, label]) => (
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
              <th onClick={() => handleRequestSort('name')} style={{ cursor: 'pointer' }}>
                会社名 {orderBy === 'name' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>メールアドレス</th>
              <th>電話番号</th>
              <th>プラン</th>
              <th>ユーザー数</th>
              <th>ステータス</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.companies.map((company) => (
              <tr key={company.id} className="w3-hover-light-gray">
                <td>
                  <div className="w3-cell-row">
                    <FaBuilding className="w3-margin-right" />
                    {company.name}
                  </div>
                </td>
                <td>
                  <div className="w3-cell-row">
                    <FaEnvelope className="w3-margin-right" />
                    {company.email}
                  </div>
                </td>
                <td>
                  <div className="w3-cell-row">
                    <FaPhone className="w3-margin-right" />
                    {company.phone || '-'}
                  </div>
                </td>
                <td>
                  <span className={`w3-tag ${planColors[company.subscription?.plan]}`}>
                    {planLabels[company.subscription?.plan]}
                  </span>
                </td>
                <td>
                  <div className="w3-cell-row">
                    <FaUsers className="w3-margin-right" />
                    {company.users?.length || 0} / {company.subscription?.maxUsers || 0}
                  </div>
                </td>
                <td>
                  <span className={`w3-tag ${company.isActive ? 'w3-green' : 'w3-red'}`}>
                    {company.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="w3-bar">
                    <button
                      className="w3-button w3-small w3-blue"
                      onClick={() => handleOpenDialog(company)}
                      title="会社編集"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`w3-button w3-small ${company.isActive ? 'w3-red' : 'w3-green'}`}
                      onClick={() => updateCompanyStatus.mutate({ companyId: company.id, status: !company.isActive })}
                      title={company.isActive ? '非アクティブ化' : 'アクティブ化'}
                    >
                      {company.isActive ? <FaBan /> : <FaCheck />}
                    </button>
                    <button
                      className="w3-button w3-small w3-red"
                      onClick={() => {
                        if (window.confirm('この会社を削除してもよろしいですか？\n所属ユーザーは未所属になります。')) {
                          deleteCompany.mutate(company.id);
                        }
                      }}
                      title="会社削除"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.companies.length === 0 && (
              <tr>
                <td colSpan="8" className="w3-center w3-text-gray">
                  会社はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          {page + 1} / {Math.ceil((data?.pagination.total || 0) / rowsPerPage)}
        </span>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= (data?.pagination.total || 0)}
        >
          &rsaquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(Math.ceil((data?.pagination.total || 0) / rowsPerPage) - 1)}
          disabled={(page + 1) * rowsPerPage >= (data?.pagination.total || 0)}
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

      <CompanyDialog
        open={openDialog}
        onClose={handleCloseDialog}
        company={selectedCompany}
        onSubmit={formik.handleSubmit}
        formik={formik}
      />
    </div>
  );
};

export default Companies;