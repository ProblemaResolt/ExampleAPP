import { useState, useEffect } from 'react';
import api from '../utils/axios';

export const useAttendanceData = (currentDate) => {
  const [attendanceData, setAttendanceData] = useState({});
  const [workSettings, setWorkSettings] = useState({
    standardHours: 8,
    breakTime: 60,
    overtimeThreshold: 480,
    defaultTransportationCost: 0,
    timeInterval: 15
  });
  const [monthlyStats, setMonthlyStats] = useState({
    workDays: 0,
    totalHours: 0,
    overtimeHours: 0,
    leaveDays: 0,
    lateCount: 0,
    transportationCost: 0
  });  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // API関数
  const attendanceAPI = {
    getMonthlyData: (year, month) => api.get(`/attendance/monthly/${year}/${month}?t=${Date.now()}`),
    updateAttendance: (data) => api.post('/attendance/update', data),
    updateWorkReport: (data) => api.post('/attendance/work-report', data),
    getWorkSettings: () => api.get('/attendance/work-settings'),
    updateWorkSettings: (data) => api.post('/attendance/work-settings', data),
    exportToExcel: (year, month) => api.get(`/attendance/export/${year}/${month}`, { responseType: 'blob' }),
    approveLeave: (leaveId) => api.patch(`/attendance/approve-leave/${leaveId}`),
    rejectLeave: (leaveId) => api.patch(`/attendance/reject-leave/${leaveId}`)
  };

  // 月次データ取得関数（テスト用に外部から呼び出し可能）
  const getMonthlyData = async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      console.log('📅 Fetching monthly data for:', year, month);
      const response = await attendanceAPI.getMonthlyData(year, month);
      console.log('🔍 Full API response:', response.data);
      
      console.log('👤 Current user context:', window.localStorage.getItem('user') || 'No user in localStorage');
      console.log('👤 Target user from API:', response.data.data?.userId);
      console.log('👤 Target user name from API:', response.data.data?.userName);
      console.log('📊 Monthly stats received:', response.data.data?.monthlyStats);
      console.log('🕐 Attendance data received:', Object.keys(response.data.data?.attendanceData || {}));
      
      // 遅刻回数の詳細ログ
      const lateCount = response.data.data?.monthlyStats?.lateCount;
      console.log('⏰ Late count value:', lateCount, typeof lateCount);
      
      // 他の統計値も確認
      const monthlyStatsReceived = response.data.data?.monthlyStats || {};
      console.log('📈 All monthly stats:', monthlyStatsReceived);
      Object.entries(monthlyStatsReceived).forEach(([key, value]) => {
        console.log(`   ${key}: ${value} (${typeof value})`);
      });
      
      // レスポンス構造に合わせて設定
      setAttendanceData(response.data.data?.attendanceData || {});
      setMonthlyStats(response.data.data?.monthlyStats || {});
      return response.data;
    } catch (err) {
      console.error('月次データの取得に失敗しました:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };  // 内部用月次データ取得（useEffectで使用）
  const fetchMonthlyData = async () => {
    if (currentDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      await getMonthlyData(year, month);
    }
  };

  const fetchWorkSettings = async () => {
    setError(null);
    try {
      const response = await attendanceAPI.getWorkSettings();
      setWorkSettings(response.data);
    } catch (err) {
      console.error('勤務設定の取得に失敗しました:', err);
      setError(err);
    }
  };
  // 勤怠データ更新
  const updateAttendance = async (updateData) => {
    try {
      const response = await attendanceAPI.updateAttendance(updateData);
      
      if (response.status === 200) {
        // 月次データを再取得して更新
        await fetchMonthlyData();
        return true;
      }
    } catch (error) {
      console.error('勤怠データの保存に失敗しました:', error);
      throw error;
    }
  };

  // 業務レポート更新
  const updateWorkReport = async (reportData) => {
    try {
      const response = await attendanceAPI.updateWorkReport(reportData);
      
      if (response.status === 200) {
        await fetchMonthlyData();
        return true;
      }
    } catch (error) {
      console.error('業務レポートの保存に失敗しました:', error);
      throw error;
    }
  };

  // データ更新（リフレッシュ）
  const handleRefresh = async () => {
    await fetchMonthlyData();
    await fetchWorkSettings();
  };

  // 休暇申請承認
  const approveLeave = async (leaveId) => {
    try {
      const response = await attendanceAPI.approveLeave(leaveId);
      if (response.status === 200) {
        await fetchMonthlyData();
        return true;
      }
    } catch (error) {
      console.error('休暇申請の承認に失敗しました:', error);
      throw error;
    }
  };

  // 休暇申請拒否
  const rejectLeave = async (leaveId) => {
    try {
      const response = await attendanceAPI.rejectLeave(leaveId);
      if (response.status === 200) {
        await fetchMonthlyData();
        return true;
      }
    } catch (error) {
      console.error('休暇申請の拒否に失敗しました:', error);
      throw error;
    }
  };

  // 交通費一括設定の保存
  const saveBulkTransportation = async (transportationData) => {
    try {
      console.log('交通費一括設定データ:', transportationData);
      
      const response = await api.post('/attendance/bulk-transportation-monthly', {
        amount: parseInt(transportationData.amount, 10) || 0,
        year: transportationData.year,
        month: transportationData.month,
        applyToAllDays: transportationData.applyToAllDays,
        applyToWorkingDaysOnly: transportationData.applyToWorkingDaysOnly
      });

      if (response.data.status === 'success') {
        await fetchMonthlyData(); // データを再取得
        return response.data.message;
      }
    } catch (error) {
      console.error('=== 交通費一括設定エラー詳細 ===');
      console.error('エラーオブジェクト:', error);
      console.error('ステータス:', error.response?.status);
      console.error('レスポンスデータ:', error.response?.data);
      throw error;
    }
  };
  // 月次データ取得をトリガー
  useEffect(() => {
    if (currentDate) {
      fetchMonthlyData();
      fetchWorkSettings();
    }
  }, [currentDate]);

  return {
    attendanceData,
    setAttendanceData,
    workSettings,
    setWorkSettings,
    monthlyStats,
    monthlyData: monthlyStats, // テスト互換性のためのエイリアス
    loading,
    isLoading: loading, // テスト互換性のためのエイリアス
    error,
    leaveRequests: [], // TODO: 実装時に追加
    editingCell: null, // TODO: 実装時に追加
    setEditingCell: () => {}, // TODO: 実装時に追加
    getMonthlyData, // テストで必要な関数
    fetchMonthlyData,
    fetchWorkSettings,
    updateAttendance,
    updateWorkReport,
    handleRefresh,
    approveLeave,
    rejectLeave,
    saveBulkTransportation,
    attendanceAPI
  };
};
