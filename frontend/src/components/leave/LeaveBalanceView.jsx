import React, { useState, useEffect } from 'react';
import { FaCalendarCheck, FaChartPie, FaInfoCircle } from 'react-icons/fa';
import api from '../../utils/axios';

const LeaveBalanceView = ({ userId, userRole }) => {
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leave/leave-balance');
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.error('残高取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeInfo = (leaveType) => {
    const types = {
      'PAID_LEAVE': {
        name: '有給休暇',
        icon: '🏖️',
        description: '法定の年次有給休暇です。労働基準法に基づき付与されます。',
        color: 'blue'
      },
      'SICK_LEAVE': {
        name: '病気休暇',
        icon: '🏥',
        description: '病気や怪我の治療のための休暇です。',
        color: 'red'
      },
      'PERSONAL_LEAVE': {
        name: '私用休暇',
        icon: '👤',
        description: '個人的な用事のための休暇です。',
        color: 'orange'
      },
      'SPECIAL': {
        name: '特別休暇',
        icon: '⭐',
        description: '慶弔休暇など特別な事由による休暇です。',
        color: 'purple'
      }
    };
    return types[leaveType] || {
      name: leaveType,
      icon: '📅',
      description: 'その他の休暇です。',
      color: 'grey'
    };
  };

  const calculateUsageRate = (used, total) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getUsageColor = (rate) => {
    if (rate >= 80) return 'red';
    if (rate >= 60) return 'orange';
    if (rate >= 40) return 'yellow';
    return 'green';
  };

  if (loading) {
    return (
      <div className="w3-container w3-center w3-padding-64">
        <i className="fa fa-spinner fa-spin w3-xlarge"></i>
        <p>残高情報を読み込み中...</p>
      </div>
    );
  }

  if (!leaveBalance || !leaveBalance.leaveBalances || leaveBalance.leaveBalances.length === 0) {
    return (
      <div className="w3-container">
        <div className="w3-card w3-blue w3-padding w3-margin-bottom w3-round">
          <h2><FaCalendarCheck className="w3-margin-right" />休暇残高</h2>
          <p>あなたの休暇残高を確認できます</p>
        </div>
        
        <div className="w3-card w3-white w3-padding w3-center w3-round">
          <div className="w3-xlarge w3-text-grey w3-margin">
            <FaInfoCircle />
          </div>
          <h3 className="w3-text-grey">残高情報がありません</h3>
          <p>まだ休暇残高が設定されていません。管理者にお問い合わせください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w3-container">
      {/* ヘッダー */}
      <div className="w3-card w3-blue w3-padding w3-margin-bottom w3-round">
        <h2><FaCalendarCheck className="w3-margin-right" />休暇残高</h2>
        <p>あなたの休暇残高を確認できます</p>
      </div>

      {/* 残高カード */}
      <div className="w3-row-padding">
        {leaveBalance.leaveBalances.map((balance, index) => {
          const typeInfo = getLeaveTypeInfo(balance.leaveType);
          const usageRate = calculateUsageRate(balance.usedDays, balance.totalDays);
          const usageColor = getUsageColor(usageRate);
          
          return (
            <div key={index} className="w3-col s12 m6 l4 w3-margin-bottom">
              <div className="w3-card w3-white w3-round w3-hover-shadow">
                {/* カードヘッダー */}
                <div className={`w3-container w3-${typeInfo.color} w3-padding`}>
                  <h4>
                    <span className="w3-xlarge">{typeInfo.icon}</span>
                    <span className="w3-margin-left">{typeInfo.name}</span>
                  </h4>
                </div>
                
                {/* 残高情報 */}
                <div className="w3-container w3-padding">
                  <div className="w3-row w3-margin-bottom">
                    <div className="w3-col s6 w3-center">
                      <div className="w3-xxlarge w3-text-blue">
                        {balance.remainingDays}
                      </div>
                      <p className="w3-small w3-text-grey">残り日数</p>
                    </div>
                    <div className="w3-col s6 w3-center">
                      <div className="w3-xxlarge w3-text-green">
                        {balance.totalDays}
                      </div>
                      <p className="w3-small w3-text-grey">総日数</p>
                    </div>
                  </div>
                  
                  {/* 使用率バー */}
                  <div className="w3-margin-bottom">
                    <p className="w3-small"><b>使用率: {usageRate}%</b></p>
                    <div className="w3-light-grey w3-round">
                      <div 
                        className={`w3-container w3-${usageColor} w3-round`}
                        style={{ width: `${usageRate}%`, minWidth: '2px' }}
                      >
                        <div className="w3-padding-small"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 詳細情報 */}
                  <div className="w3-panel w3-pale-grey w3-border w3-round">
                    <div className="w3-row w3-small">
                      <div className="w3-col s6">
                        <p><b>使用済み:</b> {balance.usedDays}日</p>
                      </div>
                      <div className="w3-col s6">
                        <p><b>年度:</b> {balance.year}年</p>
                      </div>
                    </div>
                    {balance.expiryDate && (
                      <p className="w3-small w3-text-red">
                        <b>有効期限:</b> {new Date(balance.expiryDate).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  
                  {/* 説明 */}
                  <p className="w3-small w3-text-grey w3-margin-top">
                    {typeInfo.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 使用状況サマリー */}
      <div className="w3-card w3-white w3-margin-top w3-round">
        <div className="w3-container w3-padding w3-border-bottom">
          <h3><FaChartPie className="w3-margin-right" />使用状況サマリー</h3>
        </div>
        
        <div className="w3-container w3-padding">
          <div className="w3-row-padding">
            <div className="w3-col s12 m6">
              <h4>年間使用状況</h4>
              <div className="w3-responsive">
                <table className="w3-table w3-striped w3-bordered">
                  <thead>
                    <tr className="w3-blue">
                      <th>休暇種類</th>
                      <th>使用日数</th>
                      <th>総日数</th>
                      <th>使用率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalance.leaveBalances.map((balance, index) => {
                      const typeInfo = getLeaveTypeInfo(balance.leaveType);
                      const usageRate = calculateUsageRate(balance.usedDays, balance.totalDays);
                      
                      return (
                        <tr key={index}>
                          <td>
                            <span className="w3-margin-right">{typeInfo.icon}</span>
                            {typeInfo.name}
                          </td>
                          <td>{balance.usedDays}日</td>
                          <td>{balance.totalDays}日</td>
                          <td>
                            <span className={`w3-tag w3-${getUsageColor(usageRate)} w3-round`}>
                              {usageRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="w3-col s12 m6">
              <h4>アドバイス</h4>
              <div className="w3-panel w3-pale-blue w3-border w3-round">
                <h5>💡 休暇取得のポイント</h5>
                <ul className="w3-ul">
                  <li>有給休暇は計画的に取得しましょう</li>
                  <li>連続休暇でリフレッシュも大切です</li>
                  <li>年度末の失効に注意してください</li>
                  <li>体調不良時は無理せず病気休暇を</li>
                </ul>
              </div>
              
              {leaveBalance.leaveBalances.some(b => b.leaveType === 'PAID_LEAVE' && b.remainingDays > 10) && (
                <div className="w3-panel w3-pale-green w3-border w3-round">
                  <p><b>🌟 休暇取得を検討してみませんか？</b></p>
                  <p>有給休暇に十分な残日数があります。ワークライフバランスのため、計画的な休暇取得をおすすめします。</p>
                </div>
              )}
              
              {leaveBalance.leaveBalances.some(b => b.leaveType === 'PAID_LEAVE' && b.remainingDays < 5) && (
                <div className="w3-panel w3-pale-red w3-border w3-round">
                  <p><b>⚠️ 有給残日数が少なくなっています</b></p>
                  <p>急な体調不良に備え、少し余裕を持った計画を立てることをおすすめします。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceView;
