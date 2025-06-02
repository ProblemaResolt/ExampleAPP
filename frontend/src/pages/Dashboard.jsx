import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FaUserPlus, 
  FaBuilding, 
  FaCreditCard, 
  FaSpinner, 
  FaUser, 
  FaYenSign 
} from 'react-icons/fa6';
import api from '../utils/axios';
import { format } from 'date-fns';

// Quick action buttons
const QuickActions = ({ onAction }) => (
  <div className="w3-row-padding">
    <div className="w3-col m4">      <button
        className="w3-button w3-blue w3-block"
        onClick={() => onAction('addUser')}
      >
        <FaUserPlus className="w3-margin-right" />
        ユーザーを追加
      </button>
    </div>    <div className="w3-col m4">
      <button
        className="w3-button w3-blue w3-block"
        onClick={() => onAction('addCompany')}
      >
        <FaBuilding className="w3-margin-right" />
        会社を追加
      </button>
    </div>
    <div className="w3-col m4">      <button
        className="w3-button w3-blue w3-block"
        onClick={() => onAction('addSubscription')}
      >
        <FaCreditCard className="w3-margin-right" />
        サブスクリプションを追加
      </button>
    </div>
  </div>
);

// Subscription overview card
const SubscriptionOverview = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="w3-center w3-padding">
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="w3-panel w3-red">
        <p>{error.message}</p>
      </div>
    );
  }

  const overviewData = data?.data ?? {};
  const activeSubscriptions = overviewData.activeSubscriptions ?? 0;
  const totalRevenue = overviewData.totalRevenue ?? 0;
  const expiringSoon = overviewData.expiringSoon ?? 0;

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3>サブスクリプション概要</h3>
        <div className="w3-row-padding">
          <div className="w3-col m4">
            <div className="w3-center">
              <h2 className="w3-text-blue">{activeSubscriptions}</h2>
              <p className="w3-text-gray">アクティブなサブスクリプション</p>
            </div>
          </div>
          <div className="w3-col m4">
            <div className="w3-center">
              <h2 className="w3-text-green">{totalRevenue}</h2>
              <p className="w3-text-gray">月間売上</p>
            </div>
          </div>
          <div className="w3-col m4">
            <div className="w3-center">
              <h2 className="w3-text-orange">{expiringSoon}</h2>
              <p className="w3-text-gray">期限切れ間近</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent activities card
const RecentActivities = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="w3-center w3-padding">
        <FaSpinner className="fa-spin w3-xxlarge" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="w3-panel w3-red">
        <p>{error.message}</p>
      </div>
    );
  }

  const activities = data?.data ?? [];

  return (
    <div className="w3-card-4">
      <div className="w3-container">
        <h3>最近のアクティビティ</h3>
        <ul className="w3-ul w3-hoverable">
          {activities.map((activity) => (
            <li key={activity.id} className="w3-padding-16">
              <div className="w3-cell-row">                <div className="w3-cell" style={{ width: '40px' }}>
                  {activity.type === 'user' && <FaUser className="w3-text-blue" />}
                  {activity.type === 'company' && <FaBuilding className="w3-text-green" />}
                  {activity.type === 'subscription' && <FaCreditCard className="w3-text-orange" />}
                  {activity.type === 'payment' && <FaYenSign className="w3-text-red" />}
                </div>
                <div className="w3-cell">
                  <div>{activity.description}</div>
                  <div className="w3-small w3-text-gray">
                    {format(new Date(activity.timestamp), 'PPp')}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="w3-padding-16 w3-center w3-text-gray">
              アクティビティはありません
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [error] = useState('');

  const fetchSubscriptionOverview = async () => {
    try {
      const response = await api.get('/api/subscriptions/overview');
      return response.data;
    } catch (e) {
      console.error("fetchSubscriptionOverview error:", e);
      throw e;
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/api/activities/recent');
      return response.data;
    } catch (e) {
      console.error("fetchRecentActivities error:", e);
      throw e;
    }
  };

  const { data: subscriptionOverview, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-overview'],
    queryFn: fetchSubscriptionOverview
  });

  const { data: recentActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: fetchRecentActivities
  });

  const handleQuickAction = (action) => {
    switch (action) {
      case 'addUser':
        navigate('/users/new');
        break;
      case 'addCompany':
        navigate('/companies/new');
        break;
      case 'addSubscription':
        navigate('/subscriptions/new');
        break;
      default:
        break;
    }
  };

  return (
    <div className="w3-container">
      <h2>ダッシュボード</h2>

      {error && (
        <div className="w3-panel w3-red">
          <p>{error}</p>
        </div>
      )}

      <div className="w3-row-padding">
        {/* Quick Actions */}
        <div className="w3-col m12">
          <div className="w3-card-4">
            <div className="w3-container">
              <h3>クイックアクション</h3>
              <QuickActions onAction={handleQuickAction} />
            </div>
          </div>
        </div>

        {/* Subscription Overview */}
        <div className="w3-col m8">
          <SubscriptionOverview
            data={subscriptionOverview}
            isLoading={isLoadingSubscription}
          />
        </div>

        {/* Recent Activities */}
        <div className="w3-col m4">
          <RecentActivities
            data={recentActivities}
            isLoading={isLoadingActivities}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 