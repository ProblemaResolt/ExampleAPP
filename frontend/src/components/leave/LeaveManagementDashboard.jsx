import React, { useState, useEffect } from 'react';
import { 
  FaCalendarPlus, 
  FaHistory, 
  FaCalendarCheck, 
  FaUserCheck, 
  FaTachometerAlt,
  FaChartLine 
} from 'react-icons/fa';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveHistory from './LeaveHistory';
import LeaveBalanceView from './LeaveBalanceView';
import ApprovalManagement from '../approval/ApprovalManagement';
import api from '../../utils/axios';

const LeaveManagementDashboard = ({ userId, userRole }) => {
  // COMPANY権限の場合は承認管理のみを表示
  const [activeView, setActiveView] = useState(userRole === 'COMPANY' ? 'approval' : 'dashboard');
  const [dashboardData, setDashboardData] = useState({
    recentRequests: [],
    pendingApprovals: [],
    leaveBalance: null,
    stats: {
      totalRequests: 0,
      pendingCount: 0,
      approvedCount: 0,
      usedDays: 0
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeView === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeView]);
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // COMPANY権限の場合は承認管理データのみ取得
      if (userRole === 'COMPANY') {
        const pendingResponse = await api.get('/leave/leave-requests', { 
          params: { status: 'PENDING' } 
        });
        const pendingApprovals = pendingResponse.data.data?.leaveRequests || [];
        
        setDashboardData({
          recentRequests: [],
          pendingApprovals,
          leaveBalance: null,
          stats: {
            totalRequests: 0,
            pendingCount: pendingApprovals.length,
            approvedCount: 0,
            usedDays: 0
          }
        });
        return;
      }
      
      // 一般ユーザー・MANAGER・ADMINの場合は従来通り
      const recentResponse = await api.get('/leave/leave-requests', { 
        params: { userId, limit: 5 } 
      });
      
      // 承認待ちの申請（管理者の場合）
      let pendingApprovals = [];
      if (['ADMIN', 'MANAGER'].includes(userRole)) {
        const pendingResponse = await api.get('/leave/leave-requests', { 
          params: { status: 'PENDING' } 
        });
        pendingApprovals = pendingResponse.data.data?.leaveRequests || [];
      }
      
      // 残高情報
      const balanceResponse = await api.get('/leave/leave-balance');
      
      const recentRequests = recentResponse.data.data?.leaveRequests || [];
      const leaveBalance = balanceResponse.data.data;
      
      // 統計計算
      const stats = {
        totalRequests: recentRequests.length,
        pendingCount: recentRequests.filter(req => req.status === 'PENDING').length,
        approvedCount: recentRequests.filter(req => req.status === 'APPROVED').length,
        usedDays: recentRequests
          .filter(req => req.status === 'APPROVED')
          .reduce((sum, req) => sum + req.days, 0)
      };
      
      setDashboardData({
        recentRequests,
        pendingApprovals,
        leaveBalance,
        stats
      });
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type) => {
    const types = {
      'PAID_LEAVE': '有給休暇',
      'SICK_LEAVE': '病気休暇',
      'PERSONAL_LEAVE': '私用休暇',
      'MATERNITY': '産前産後休暇',
      'PATERNITY': '育児休暇',
      'SPECIAL': '特別休暇',
      'UNPAID': '無給休暇'
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': 'w3-yellow w3-text-black',
      'APPROVED': 'w3-green',
      'REJECTED': 'w3-red'
    };
    const labels = {
      'PENDING': '承認待ち',
      'APPROVED': '承認済み',
      'REJECTED': '却下'
    };
    
    return (
      <span className={`w3-tag w3-round w3-small ${badges[status] || 'w3-grey'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };
  const renderNavigation = () => (
    <div className="w3-bar w3-white w3-card w3-round w3-margin-bottom">      {/* COMPANY権限の場合は承認管理のみ表示 */}
      {userRole === 'COMPANY' ? (
        <button
          onClick={() => setActiveView('approval')}
          className={`w3-bar-item w3-button w3-hover-blue ${
            activeView === 'approval' ? 'w3-blue' : ''
          }`}
        >
          <FaUserCheck className="w3-margin-right" />
          承認管理センター
          {dashboardData.pendingApprovals.length > 0 && (
            <span className="w3-badge w3-red w3-margin-left">
              {dashboardData.pendingApprovals.length}
            </span>
          )}
        </button>
      ) : (
        <>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w3-bar-item w3-button w3-hover-blue ${
              activeView === 'dashboard' ? 'w3-blue' : ''
            }`}
          >            <FaTachometerAlt className="w3-margin-right" />
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveView('request')}
            className={`w3-bar-item w3-button w3-hover-blue ${
              activeView === 'request' ? 'w3-blue' : ''
            }`}
          >
            <FaCalendarPlus className="w3-margin-right" />
            新規申請
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`w3-bar-item w3-button w3-hover-blue ${
              activeView === 'history' ? 'w3-blue' : ''
            }`}
          >
            <FaHistory className="w3-margin-right" />
            申請履歴
          </button>
          <button
            onClick={() => setActiveView('balance')}
            className={`w3-bar-item w3-button w3-hover-blue ${
              activeView === 'balance' ? 'w3-blue' : ''
            }`}
          >
            <FaCalendarCheck className="w3-margin-right" />
            残高確認
          </button>
          {['ADMIN', 'MANAGER'].includes(userRole) && (
            <button
              onClick={() => setActiveView('approval')}
              className={`w3-bar-item w3-button w3-hover-blue ${
                activeView === 'approval' ? 'w3-blue' : ''
              }`}
            >
              <FaUserCheck className="w3-margin-right" />
              承認管理
              {dashboardData.pendingApprovals.length > 0 && (
                <span className="w3-badge w3-red w3-margin-left">
                  {dashboardData.pendingApprovals.length}
                </span>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="w3-container">
      {/* ヘッダー */}
      <div className="w3-card w3-blue w3-padding w3-margin-bottom w3-round">
        <h2><FaTachometerAlt className="w3-margin-right" />休暇管理ダッシュボード</h2>
        <p>休暇申請の状況や残高を一目で確認できます</p>
      </div>

      {loading && (
        <div className="w3-center w3-padding">
          <i className="fa fa-spinner fa-spin w3-xlarge"></i>
          <p>データを読み込み中...</p>
        </div>
      )}

      {/* 統計カード */}
      <div className="w3-row-padding w3-margin-bottom">
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-blue">
              <FaHistory />
            </div>
            <h3 className="w3-text-blue">{dashboardData.stats.totalRequests}</h3>
            <p>今年の申請数</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-orange">
              <FaCalendarPlus />
            </div>
            <h3 className="w3-text-orange">{dashboardData.stats.pendingCount}</h3>
            <p>承認待ち</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-green">
              ✓
            </div>
            <h3 className="w3-text-green">{dashboardData.stats.approvedCount}</h3>
            <p>承認済み</p>
          </div>
        </div>
        <div className="w3-col s6 m3">
          <div className="w3-card w3-white w3-padding w3-round w3-center">
            <div className="w3-xlarge w3-text-purple">
              📅
            </div>
            <h3 className="w3-text-purple">{dashboardData.stats.usedDays}</h3>
            <p>取得日数</p>
          </div>
        </div>
      </div>

      <div className="w3-row-padding">
        {/* 残高サマリー */}
        <div className="w3-col s12 m6">
          <div className="w3-card w3-white w3-round">
            <div className="w3-container w3-blue w3-padding">
              <h3><FaCalendarCheck className="w3-margin-right" />残高サマリー</h3>
            </div>
            <div className="w3-container w3-padding">
              {dashboardData.leaveBalance && dashboardData.leaveBalance.leaveBalances ? (
                dashboardData.leaveBalance.leaveBalances.map((balance, index) => (
                  <div key={index} className="w3-row w3-margin-bottom w3-padding w3-border-bottom">
                    <div className="w3-col s8">
                      <h5>{getLeaveTypeLabel(balance.leaveType)}</h5>
                      <p className="w3-small w3-text-grey">
                        {balance.year}年度 (有効期限: {balance.expiryDate ? formatDate(balance.expiryDate) : '-'})
                      </p>
                    </div>
                    <div className="w3-col s4 w3-right-align">
                      <h4 className="w3-text-blue">{balance.remainingDays}日</h4>
                      <p className="w3-small w3-text-grey">/{balance.totalDays}日</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="w3-text-grey">残高情報がありません</p>
              )}
              <div className="w3-center w3-margin-top">
                <button
                  onClick={() => setActiveView('balance')}
                  className="w3-button w3-blue w3-round"
                >
                  詳細を見る
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 最近の申請 */}
        <div className="w3-col s12 m6">
          <div className="w3-card w3-white w3-round">
            <div className="w3-container w3-green w3-padding">
              <h3><FaHistory className="w3-margin-right" />最近の申請</h3>
            </div>
            <div className="w3-container w3-padding">
              {dashboardData.recentRequests.length > 0 ? (
                dashboardData.recentRequests.map((request, index) => (
                  <div key={request.id} className="w3-row w3-margin-bottom w3-padding w3-border-bottom">
                    <div className="w3-col s8">
                      <h6>{getLeaveTypeLabel(request.leaveType || request.type)}</h6>
                      <p className="w3-small w3-text-grey">
                        {formatDate(request.startDate)} ({request.days}日)
                      </p>
                    </div>
                    <div className="w3-col s4 w3-right-align">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="w3-text-grey">まだ申請がありません</p>
              )}
              <div className="w3-center w3-margin-top">
                <button
                  onClick={() => setActiveView('history')}
                  className="w3-button w3-green w3-round"
                >
                  全履歴を見る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 管理者用承認待ちセクション */}
      {['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole) && dashboardData.pendingApprovals.length > 0 && (
        <div className="w3-card w3-white w3-margin-top w3-round">
          <div className="w3-container w3-orange w3-padding">
            <h3><FaUserCheck className="w3-margin-right" />承認が必要な申請</h3>
          </div>
          <div className="w3-container w3-padding">
            {dashboardData.pendingApprovals.slice(0, 3).map((request, index) => (
              <div key={request.id} className="w3-row w3-margin-bottom w3-padding w3-border-bottom">
                <div className="w3-col s8">
                  <h6>
                    {request.user.firstName} {request.user.lastName} - 
                    {getLeaveTypeLabel(request.leaveType || request.type)}
                  </h6>
                  <p className="w3-small w3-text-grey">
                    {formatDate(request.startDate)} ～ {formatDate(request.endDate)} ({request.days}日)
                  </p>
                </div>
                <div className="w3-col s4 w3-right-align">
                  <span className="w3-tag w3-yellow w3-text-black w3-round w3-small">
                    承認待ち
                  </span>
                </div>
              </div>
            ))}
            <div className="w3-center w3-margin-top">
              <button
                onClick={() => setActiveView('approval')}
                className="w3-button w3-orange w3-round"
              >
                承認管理へ
                {dashboardData.pendingApprovals.length > 3 && (
                  <span className="w3-badge w3-red w3-margin-left">
                    +{dashboardData.pendingApprovals.length - 3}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクション */}
      <div className="w3-card w3-white w3-margin-top w3-round">
        <div className="w3-container w3-purple w3-padding">
          <h3>クイックアクション</h3>
        </div>
        <div className="w3-container w3-padding w3-center">
          <button
            onClick={() => setActiveView('request')}
            className="w3-button w3-blue w3-round w3-margin"
          >
            <FaCalendarPlus className="w3-margin-right" />
            新規申請
          </button>
          <button
            onClick={() => setActiveView('balance')}
            className="w3-button w3-green w3-round w3-margin"
          >
            <FaCalendarCheck className="w3-margin-right" />
            残高確認
          </button>
          {['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole) && (
            <button
              onClick={() => setActiveView('approval')}
              className="w3-button w3-orange w3-round w3-margin"
            >
              <FaUserCheck className="w3-margin-right" />
              承認管理
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'request':
        return (
          <LeaveRequestForm
            onBack={() => setActiveView('dashboard')}
            onSuccess={() => {
              setActiveView('dashboard');
              fetchDashboardData();
            }}
          />
        );
      case 'history':
        return <LeaveHistory userId={userId} userRole={userRole} />;
      case 'balance':
        return <LeaveBalanceView userId={userId} userRole={userRole} />;      case 'approval':
        return <ApprovalManagement userId={userId} userRole={userRole} />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="w3-container w3-margin-top">
      {renderNavigation()}
      {renderContent()}
    </div>
  );
};

export default LeaveManagementDashboard;
