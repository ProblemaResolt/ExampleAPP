import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck, FaSpinner, FaCreditCard, FaFile, FaTimes } from 'react-icons/fa';
import api from '../utils/axios';

// プラン情報
const plans = {
  free: {
    name: 'フリープラン',
    price: 0,
    features: [
      '最大5人のマネージャー',
      '基本的な機能',
      'メールサポート',
      '基本的な分析'
    ],
    color: 'w3-gray'
  },
  basic: {
    name: 'ベーシックプラン',
    price: 5000,
    features: [
      '最大20人のマネージャー',
      'すべての基本機能',
      '優先メールサポート',
      '詳細な分析',
      'カスタムレポート'
    ],
    color: 'w3-blue'
  },
  premium: {
    name: 'プレミアムプラン',
    price: 15000,
    features: [
      '無制限のマネージャー',
      'すべての機能',
      '24時間サポート',
      '高度な分析',
      'APIアクセス',
      'カスタムインテグレーション'
    ],
    color: 'w3-orange'
  },
  enterprise: {
    name: 'エンタープライズプラン',
    price: null,
    features: [
      'カスタムソリューション',
      '専任サポート',
      'カスタムインテグレーション',
      'SLA保証',
      'オンプレミス対応',
      'セキュリティ監査'
    ],
    color: 'w3-red'
  }
};

// プラン変更確認ダイアログ
const PlanChangeDialog = ({ open, onClose, selectedPlan, onConfirm, isLoading }) => {
  if (!open || !selectedPlan) return null;

  return (
    <div className="w3-modal" style={{ display: 'block' }}>
      <div className="w3-modal-content w3-animate-zoom" style={{ maxWidth: '600px', width: 'auto' }}>
        <header className="w3-container w3-blue">
          <h3>プランの変更</h3>
        </header>
        <div className="w3-container">
          <p>以下のプランに変更しますか？</p>
          <div className="w3-panel">
            <h4>{plans[selectedPlan].name}</h4>
            <h2 className="w3-text-blue">
              {plans[selectedPlan].price === null
                ? 'カスタム価格'
                : `¥${plans[selectedPlan].price.toLocaleString()}/月`}
            </h2>
            <ul className="w3-ul">
              {plans[selectedPlan].features.map((feature, index) => (
                <li key={index}>
                  <FaCheck className="w3-text-green w3-margin-right" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="w3-panel w3-pale-blue w3-border w3-border-blue">
            <p>プランを変更すると、次回の請求サイクルから新しいプランが適用されます。</p>
          </div>
        </div>
        <footer className="w3-container w3-padding">
          <button className="w3-button w3-gray" onClick={onClose}>
            キャンセル
          </button>
          <button
            className={`w3-button ${plans[selectedPlan].color} w3-right`}
            onClick={() => onConfirm(selectedPlan)}
            disabled={isLoading}
          >
            プランを変更
          </button>
        </footer>
      </div>
    </div>
  );
};

const Subscriptions = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // 現在のサブスクリプション情報の取得
  const { data: currentSubscription, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/current');
      return data;
    }
  });

  // 支払い履歴の取得
  const { data: paymentHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['payments', { page: page + 1, limit: rowsPerPage, sort: `${orderBy}:${order}` }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const { data } = await api.get(`/subscriptions/payments?${new URLSearchParams(params)}`);
      return data;
    }
  });

  // プラン変更
  const changePlan = useMutation({
    mutationFn: async (planId) => {
      const { data } = await api.post('/subscriptions/change-plan', { planId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentSubscription']);
      setSuccess('プランを変更しました');
      setError('');
      handleCloseDialog();
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'プランの変更に失敗しました');
      setSuccess('');
    }
  });

  // ダイアログの開閉
  const handleOpenDialog = (plan) => {
    setSelectedPlan(plan);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPlan(null);
  };

  // テーブルのソート
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (isLoadingCurrent || isLoadingHistory) {
    return (
      <div className="w3-container w3-center" style={{ paddingTop: '200px' }}>
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }

  return (
    <div className="w3-container">
      <h2 className="w3-margin-bottom">サブスクリプション管理</h2>

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

      {/* 現在のプラン情報 */}
      <div className="w3-margin-bottom">
        <div className="w3-container">
          <div className="w3-row-padding">
            <div className="w3-col m6">
              <h3>現在のプラン</h3>
              <div className="w3-margin-bottom">
                <span className={`w3-tag ${plans[currentSubscription?.plan]?.color || 'w3-gray'} w3-large`}>
                  <FaCreditCard className="w3-margin-right" />
                  {plans[currentSubscription?.plan]?.name || '未設定'}
                </span>
                <span className={`w3-tag ${currentSubscription?.status === 'active' ? 'w3-green' : 'w3-red'} w3-margin-left`}>
                  {currentSubscription?.status === 'active' ? <FaCheck className="w3-margin-right" /> : <FaTimes className="w3-margin-right" />}
                  {currentSubscription?.status === 'active' ? '有効' : '無効'}
                </span>
              </div>
              <p className="w3-text-gray">
                更新日: {new Date(currentSubscription?.updatedAt).toLocaleDateString()}
              </p>
              {currentSubscription?.nextBillingDate && (
                <p className="w3-text-gray">
                  次回請求日: {new Date(currentSubscription?.nextBillingDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="w3-col m6">
              <h3>プラン詳細</h3>
              <ul className="w3-ul">
                {plans[currentSubscription?.plan]?.features.map((feature, index) => (
                  <li key={index}>
                    <FaCheck className="w3-text-green w3-margin-right" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* プラン一覧 */}
      <h3 className="w3-margin-bottom">利用可能なプラン</h3>
      <div className="w3-row-padding w3-margin-bottom">
        {Object.entries(plans).map(([key, plan]) => (
          <div className="w3-col m3" key={key}>
            <div className={`${currentSubscription?.plan === key ? 'w3-border w3-border-blue' : ''}`} style={{ height: '100%' }}>
              {currentSubscription?.plan === key && (
                <div className={`w3-tag ${plan.color} w3-right w3-margin`}>
                  現在のプラン
                </div>
              )}
              <div className="w3-container">
                <h4>{plan.name}</h4>
                <h2 className="w3-text-blue">
                  {plan.price === null ? 'カスタム' : `¥${plan.price.toLocaleString()}/月`}
                </h2>
                <ul className="w3-ul">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <FaCheck className="w3-text-green w3-margin-right" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w3-button ${currentSubscription?.plan === key ? 'w3-gray' : plan.color} w3-block`}
                  onClick={() => handleOpenDialog(key)}
                  disabled={currentSubscription?.plan === key}
                >
                  {currentSubscription?.plan === key ? '現在のプラン' : 'プランを変更'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 支払い履歴 */}
      <h3 className="w3-margin-bottom">支払い履歴</h3>
      <div className="w3-responsive">
        <table className="w3-table w3-bordered w3-striped">
          <thead>
            <tr>
              <th onClick={() => handleRequestSort('createdAt')} style={{ cursor: 'pointer' }}>
                日付 {orderBy === 'createdAt' && (order === 'asc' ? '↑' : '↓')}
              </th>
              <th>プラン</th>
              <th>金額</th>
              <th>ステータス</th>
              <th>支払い方法</th>
              <th>請求書</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory?.payments.map((payment) => (
              <tr key={payment.id} className="w3-hover-light-gray">
                <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`w3-tag ${plans[payment.plan]?.color}`}>
                    <FaCreditCard className="w3-margin-right" />
                    {plans[payment.plan]?.name}
                  </span>
                </td>
                <td>¥{payment.amount.toLocaleString()}</td>
                <td>
                  <span className={`w3-tag ${
                    payment.status === 'succeeded'
                      ? 'w3-green'
                      : payment.status === 'pending'
                      ? 'w3-orange'
                      : 'w3-red'
                  }`}>
                    {payment.status === 'succeeded'
                      ? '支払い完了'
                      : payment.status === 'pending'
                      ? '処理中'
                      : '失敗'}
                  </span>
                </td>
                <td>{payment.paymentMethod}</td>
                <td>
                  <button
                    className="w3-button w3-small w3-blue"
                    onClick={() => window.open(payment.invoiceUrl, '_blank')}
                    title="請求書を表示"
                  >
                    <FaFile />
                  </button>
                </td>
              </tr>
            ))}
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
          {page + 1} / {Math.ceil((paymentHistory?.total || 0) / rowsPerPage)}
        </span>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(p => p + 1)}
          disabled={(page + 1) * rowsPerPage >= (paymentHistory?.total || 0)}
        >
          &rsaquo;
        </button>
        <button
          className="w3-button w3-bar-item"
          onClick={() => setPage(Math.ceil((paymentHistory?.total || 0) / rowsPerPage) - 1)}
          disabled={(page + 1) * rowsPerPage >= (paymentHistory?.total || 0)}
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

      <PlanChangeDialog
        open={openDialog}
        onClose={handleCloseDialog}
        selectedPlan={selectedPlan}
        onConfirm={changePlan.mutate}
        isLoading={changePlan.isLoading}
      />
    </div>
  );
};

export default Subscriptions;