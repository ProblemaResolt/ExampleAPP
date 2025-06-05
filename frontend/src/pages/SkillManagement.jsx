import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCodeBranch, FaEye, FaDownload, FaChartBar, FaDatabase } from 'react-icons/fa';
import api from '../utils/axios';

const SkillManagement = () => {
  const [selectedTab, setSelectedTab] = useState('efficiency');
  const [threshold, setThreshold] = useState(2);
  const queryClient = useQueryClient();

  // DB効率化統計データ取得
  const { data: efficiencyData, isLoading: efficiencyLoading } = useQuery({
    queryKey: ['efficiency-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/skills/efficiency-stats');
      return response.data.data;
    }
  });

  // スキル重複分析データ取得
  const { data: duplicatesData, isLoading: duplicatesLoading } = useQuery({
    queryKey: ['skill-duplicates'],
    queryFn: async () => {
      const response = await api.get('/api/admin/skills/skill-duplicates');
      return response.data.data;
    }
  });

  // グローバルスキル統合提案データ取得
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['global-skill-suggestions', threshold],
    queryFn: async () => {
      const response = await api.post('/api/admin/skills/suggest-global-skills', { threshold });
      return response.data.data;
    },
    enabled: selectedTab === 'suggestions'
  });

  // グローバル化実行
  const migrateToGlobal = useMutation({
    mutationFn: async ({ skillName, category, description, affectedSkillIds }) => {
      const response = await api.post('/api/admin/skills/migrate-to-global', {
        skillName,
        category,
        description,
        affectedSkillIds
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-duplicates']);
      queryClient.invalidateQueries(['global-skill-suggestions']);
      queryClient.invalidateQueries(['efficiency-stats']);
      alert('グローバルスキルへの統合が完了しました！');
    },
    onError: (error) => {
      console.error('Migration error:', error);
      alert('統合処理中にエラーが発生しました: ' + error.message);
    }
  });

  const handleMigrateSkill = (suggestion) => {
    if (confirm(`「${suggestion.suggestedName}」として${suggestion.skillIds.length}個のスキルを統合しますか？`)) {
      migrateToGlobal.mutate({
        skillName: suggestion.suggestedName,
        category: suggestion.category,
        description: `${suggestion.companies.join(', ')}で使用されているスキル`,
        affectedSkillIds: suggestion.skillIds
      });
    }
  };

  // CSVダウンロード機能
  const downloadReport = () => {
    if (!duplicatesData) return;
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "スキル名,会社数,バリエーション,総ユーザー数\n" +
      duplicatesData.duplicates.map(dup => 
        `"${dup.normalizedName}",${dup.skills.length},"${dup.variations.join(', ')}",${dup.skills.reduce((sum, s) => sum + s.userCount, 0)}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "skill_duplicates_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w3-container w3-padding">
      <div className="w3-card-4 w3-white">
        <header className="w3-container w3-purple">
          <h2>🔧 スキル統合管理</h2>
        </header>
        
        {/* タブメニュー */}
        <div className="w3-container">
          <div className="w3-bar w3-light-grey">
            <button 
              className={`w3-bar-item w3-button ${selectedTab === 'efficiency' ? 'w3-purple' : ''}`}
              onClick={() => setSelectedTab('efficiency')}
            >
              <FaDatabase className="w3-margin-right" />
              DB効率化統計
            </button>
            <button 
              className={`w3-bar-item w3-button ${selectedTab === 'duplicates' ? 'w3-purple' : ''}`}
              onClick={() => setSelectedTab('duplicates')}
            >
              <FaEye className="w3-margin-right" />
              重複分析
            </button>
            <button 
              className={`w3-bar-item w3-button ${selectedTab === 'suggestions' ? 'w3-purple' : ''}`}
              onClick={() => setSelectedTab('suggestions')}
            >
              <FaCodeBranch className="w3-margin-right" />
              統合提案
            </button>
          </div>
        </div>

        <div className="w3-container w3-padding">
          {/* DB効率化統計タブ */}
          {selectedTab === 'efficiency' && (
            <div>
              {efficiencyLoading ? (
                <div className="w3-center w3-padding">
                  <i className="fa fa-spinner fa-spin fa-3x"></i>
                  <p>効率化統計を読み込み中...</p>
                </div>
              ) : efficiencyData ? (
                <div>
                  <h3>📊 データベース効率化ダッシュボード</h3>
                  
                  {/* KPI カード */}
                  <div className="w3-row-padding w3-margin-bottom">
                    <div className="w3-col m3">
                      <div className="w3-card-4 w3-green">
                        <div className="w3-container w3-padding">
                          <h4>効率化率</h4>
                          <h2>{efficiencyData.efficiency.efficiencyGainPercent}%</h2>
                          <p>容量削減効果</p>
                        </div>
                      </div>
                    </div>
                    <div className="w3-col m3">
                      <div className="w3-card-4 w3-blue">
                        <div className="w3-container w3-padding">
                          <h4>削減レコード数</h4>
                          <h2>{efficiencyData.efficiency.recordsReduced}</h2>
                          <p>レコード削減数</p>
                        </div>
                      </div>
                    </div>
                    <div className="w3-col m3">
                      <div className="w3-card-4 w3-orange">
                        <div className="w3-container w3-padding">
                          <h4>重複廃棄</h4>
                          <h2>{efficiencyData.efficiency.duplicateWasteRecords}</h2>
                          <p>重複による無駄</p>
                        </div>
                      </div>
                    </div>
                    <div className="w3-col m3">
                      <div className="w3-card-4 w3-red">
                        <div className="w3-container w3-padding">
                          <h4>レガシー残数</h4>
                          <h2>{efficiencyData.legacy.totalSkills}</h2>
                          <p>未統合スキル</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* システム比較 */}
                  <div className="w3-row-padding">
                    <div className="w3-col m6">
                      <div className="w3-card-4">
                        <header className="w3-container w3-red">
                          <h3>レガシーシステム</h3>
                        </header>
                        <div className="w3-container w3-padding">
                          <p><strong>Total Skills:</strong> {efficiencyData.legacy.totalSkills}</p>
                          <p><strong>Skills with Users:</strong> {efficiencyData.legacy.skillsWithUsers}</p>
                          <p><strong>Average Users per Skill:</strong> {efficiencyData.legacy.averageUsersPerSkill}</p>
                          <div className="w3-light-grey w3-round">
                            <div className="w3-container w3-red w3-round" style={{width: '100%'}}>
                              <div className="w3-center">100% 重複あり</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w3-col m6">
                      <div className="w3-card-4">
                        <header className="w3-container w3-green">
                          <h3>新統合システム</h3>
                        </header>
                        <div className="w3-container w3-padding">
                          <p><strong>Global Skills:</strong> {efficiencyData.newSystem.globalSkills}</p>
                          <p><strong>Company Selections:</strong> {efficiencyData.newSystem.companySelections}</p>
                          <p><strong>User Skill Mappings:</strong> {efficiencyData.newSystem.userSkillMappings}</p>
                          <div className="w3-light-grey w3-round">
                            <div className="w3-container w3-green w3-round" style={{width: `${efficiencyData.efficiency.efficiencyGainPercent}%`}}>
                              <div className="w3-center">{efficiencyData.efficiency.efficiencyGainPercent}% 効率化</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 重複分析詳細 */}
                  {efficiencyData.duplicateAnalysis.length > 0 && (
                    <div className="w3-container w3-margin-top">
                      <h4>最も重複しているスキル TOP 10</h4>
                      <table className="w3-table-all w3-hoverable">
                        <thead>
                          <tr className="w3-purple">
                            <th>スキル名</th>
                            <th>重複数</th>
                            <th>使用会社数</th>
                            <th>総ユーザー数</th>
                            <th>削減効果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {efficiencyData.duplicateAnalysis.slice(0, 10).map((dup, index) => (
                            <tr key={index}>
                              <td>{dup.skillName}</td>
                              <td>
                                <span className="w3-tag w3-red w3-round">{dup.duplicateCount}</span>
                              </td>
                              <td>{dup.companiesUsing}</td>
                              <td>{dup.totalUsers}</td>
                              <td className="w3-text-green">
                                <strong>-{dup.duplicateCount - 1} レコード</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w3-panel w3-yellow">
                  <h3>⚠️ データなし</h3>
                  <p>効率化統計データを取得できませんでした。</p>
                </div>
              )}
            </div>
          )}

          {/* 重複分析タブ */}
          {selectedTab === 'duplicates' && (
            <div>
              <div className="w3-row w3-margin-bottom">
                <div className="w3-col m8">
                  <h3>スキル重複分析</h3>
                  <p>複数の会社で同一のスキルが登録されている場合を表示します。</p>
                </div>
                <div className="w3-col m4 w3-right-align">
                  <button 
                    className="w3-button w3-green"
                    onClick={downloadReport}
                    disabled={!duplicatesData}
                  >
                    <FaDownload /> レポート出力
                  </button>
                </div>
              </div>

              {duplicatesLoading ? (
                <div className="w3-center w3-padding">
                  <i className="fa fa-spinner fa-spin fa-3x"></i>
                  <p>重複分析中...</p>
                </div>
              ) : duplicatesData && duplicatesData.duplicates.length > 0 ? (
                <div>
                  <div className="w3-panel w3-pale-red w3-leftbar w3-border-red">
                    <h4>📋 重複検出結果</h4>
                    <p><strong>{duplicatesData.duplicates.length}</strong> 個の重複スキルグループを検出しました。</p>
                    <p>総削減可能レコード数: <strong>{duplicatesData.totalDuplicateRecords}</strong></p>
                  </div>

                  <table className="w3-table-all w3-hoverable">
                    <thead>
                      <tr className="w3-red">
                        <th>正規化名</th>
                        <th>バリエーション</th>
                        <th>会社数</th>
                        <th>総ユーザー数</th>
                        <th>削減効果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicatesData.duplicates.map((dup, index) => (
                        <tr key={index}>
                          <td><strong>{dup.normalizedName}</strong></td>
                          <td>
                            <div className="w3-container">
                              {dup.variations.map((variation, vIndex) => (
                                <span key={vIndex} className="w3-tag w3-light-blue w3-margin-right w3-margin-bottom">
                                  {variation}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className="w3-tag w3-orange w3-round">{dup.skills.length}</span>
                          </td>
                          <td>{dup.skills.reduce((sum, s) => sum + s.userCount, 0)}</td>
                          <td className="w3-text-green">
                            <strong>-{dup.skills.length - 1} レコード</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w3-panel w3-green">
                  <h3>✅ 重複なし</h3>
                  <p>重複するスキルは検出されませんでした。</p>
                </div>
              )}
            </div>
          )}

          {/* 統合提案タブ */}
          {selectedTab === 'suggestions' && (
            <div>
              <div className="w3-row w3-margin-bottom">
                <div className="w3-col m8">
                  <h3>グローバルスキル統合提案</h3>
                  <p>指定した閾値以上の会社で使用されているスキルをグローバル化の候補として提案します。</p>
                </div>
                <div className="w3-col m4">
                  <label>閾値（会社数）:</label>
                  <input 
                    type="number" 
                    className="w3-input w3-border" 
                    value={threshold} 
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    min="2"
                    max="10"
                  />
                </div>
              </div>

              {suggestionsLoading ? (
                <div className="w3-center w3-padding">
                  <i className="fa fa-spinner fa-spin fa-3x"></i>
                  <p>統合候補を分析中...</p>
                </div>
              ) : suggestionsData && suggestionsData.suggestions.length > 0 ? (
                <div>
                  <div className="w3-panel w3-pale-green w3-leftbar w3-border-green">
                    <h4>💡 統合提案</h4>
                    <p><strong>{suggestionsData.suggestions.length}</strong> 個のスキルが統合候補として提案されています。</p>
                    <p>削減予想レコード数: <strong>{suggestionsData.totalPotentialSavings}</strong></p>
                  </div>

                  <table className="w3-table-all w3-hoverable">
                    <thead>
                      <tr className="w3-green">
                        <th>提案スキル名</th>
                        <th>使用会社</th>
                        <th>統合対象数</th>
                        <th>削減効果</th>
                        <th>アクション</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestionsData.suggestions.map((suggestion, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{suggestion.suggestedName}</strong>
                            <br />
                            <small className="w3-text-grey">{suggestion.category}</small>
                          </td>
                          <td>
                            <div className="w3-container">
                              {suggestion.companies.map((company, cIndex) => (
                                <span key={cIndex} className="w3-tag w3-blue w3-margin-right">
                                  {company}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className="w3-tag w3-orange w3-round">{suggestion.skillIds.length}</span>
                          </td>
                          <td className="w3-text-green">
                            <strong>-{suggestion.skillIds.length - 1} レコード</strong>
                          </td>
                          <td>
                            <button
                              className="w3-button w3-small w3-green"
                              onClick={() => handleMigrateSkill(suggestion)}
                              disabled={migrateToGlobal.isPending}
                            >
                              <FaCodeBranch /> 統合実行
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w3-panel w3-yellow">
                  <h3>📋 提案なし</h3>
                  <p>指定された条件（{threshold}社以上）に該当するスキルはありません。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillManagement;
