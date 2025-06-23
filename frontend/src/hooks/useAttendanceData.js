import { useState, useEffect } from 'react';
import api from '../utils/axios';
import { calculateMonthlyStats, addLateIndicators } from '../utils/lateArrivalUtils';

export const useAttendanceData = (currentDate, user) => {
  const [attendanceData, setAttendanceData] = useState({});
  const [workSettings, setWorkSettings] = useState({
    standardHours: 8,
    breakTime: 60,
    overtimeThreshold: 480,
    defaultTransportationCost: 0,
    timeInterval: 15,
    weekStartDay: 1
  });
  const [monthlyStats, setMonthlyStats] = useState({
    workDays: 0,
    totalHours: 0,
    overtimeHours: 0,
    leaveDays: 0,
    lateCount: 0,
    transportationCost: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // API関数
  const attendanceAPI = {
    getMonthlyData: (year, month) => api.get(`/attendance/monthly/${year}/${month}?t=${Date.now()}`),
    updateAttendance: (data) => api.post('/attendance/misc/update', data),
    updateWorkReport: (data) => api.post('/attendance/work-report', data),
    getWorkSettings: () => api.get('/attendance/work-settings'),
    updateWorkSettings: (data) => api.post('/attendance/work-settings', data),
    exportToExcel: (year, month) => api.get(`/attendance/export/${year}/${month}`, { responseType: 'blob' }),
    approveLeave: (leaveId) => api.patch(`/attendance/approve-leave/${leaveId}`),
    rejectLeave: (leaveId) => api.patch(`/attendance/reject-leave/${leaveId}`)
  };

  // 月次データ取得関数
  const getMonthlyData = async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      const response = await attendanceAPI.getMonthlyData(year, month);
      
      // バックエンドレスポンスを変換
      const backendData = response.data.data;
      const apiAttendanceData = transformBackendResponse(backendData);
      
      // 勤務設定は別途取得が必要（バックエンドレスポンスに含まれていない場合）
      const apiWorkSettings = backendData?.workSettings || workSettings;
      const apiMonthlyStats = backendData?.monthlyStats || {};
      
      // 遅刻回数をフロントエンド側で再計算
      const frontendCalculatedStats = calculateMonthlyStats(apiAttendanceData, apiWorkSettings);
      
      // 遅刻情報を勤怠データに追加
      const attendanceWithLateInfo = addLateIndicators(
        apiAttendanceData, 
        apiWorkSettings.workStartTime || apiWorkSettings.startTime || '09:00'
      );
      
      // フロントエンド計算結果を使用
      const combinedStats = {
        ...apiMonthlyStats,
        ...frontendCalculatedStats,
        apiLateCount: apiMonthlyStats.lateCount
      };
      
      setAttendanceData(attendanceWithLateInfo);
      setMonthlyStats(combinedStats);
      setWorkSettings(prev => ({ ...prev, ...apiWorkSettings }));
      
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 内部用月次データ取得
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
      setError(err);
    }
  };

  // 勤怠データ更新
  const updateAttendance = async (updateData) => {
    try {
      const response = await attendanceAPI.updateAttendance(updateData);
      
      if (response.status === 200) {
        await fetchMonthlyData();
        return true;
      }
    } catch (error) {
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
      throw error;
    }
  };

  // 交通費一括設定
  const saveBulkTransportation = async (transportationData) => {
    try {
      // 対象月の日付を全て生成
      const year = transportationData.year;
      const month = transportationData.month;
      const daysInMonth = new Date(year, month, 0).getDate();
      const registrations = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        registrations.push({
          userId: user?.id,
          amount: parseInt(transportationData.amount, 10) || 0,
          date,
          year,
          month
        });
      }

      const response = await api.post('/attendance/misc/bulk-transportation', {
        registrations
      });

      if (response.data.status === 'success') {
        await fetchMonthlyData();
        return response.data.message;
      }
    } catch (error) {
      throw error;
    }
  };

  // バックエンドレスポンスを日付ベースのattendanceDataに変換
  const transformBackendResponse = (backendData) => {
    if (!backendData) {
      return {};
    }
    
    const attendanceData = {};
    let entries = [];
    
    // パターン1: users配列がある場合（管理者ロール）
    if (backendData.users && Array.isArray(backendData.users)) {
      const currentUserId = user?.id;
      const currentUserData = backendData.users.find(userData => userData.user.id === currentUserId);
      if (currentUserData && currentUserData.entries) {
        entries = currentUserData.entries;
      }
    }
    // パターン2: 直接entriesがある場合（メンバーロール）
    else if (backendData.entries && Array.isArray(backendData.entries)) {
      entries = backendData.entries;
    }
    
    // エントリを日付ベースのオブジェクトに変換
    entries.forEach(entry => {
      // 日付をYYYY-MM-DD形式のキーに変換
      const dateKey = new Date(entry.date).toISOString().split('T')[0];

      attendanceData[dateKey] = entry;
    });
    
    return attendanceData;
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
    monthlyData: monthlyStats,
    loading,
    isLoading: loading,
    error,
    leaveRequests: [],
    editingCell: null,
    setEditingCell: () => {},
    getMonthlyData,
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
