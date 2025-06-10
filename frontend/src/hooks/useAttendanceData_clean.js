import { useState, useEffect } from 'react';
import api from '../utils/axios';
import { calculateMonthlyStats, addLateIndicators } from '../utils/lateArrivalUtils';

export const useAttendanceData = (currentDate) => {
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
    updateAttendance: (data) => api.post('/attendance/update', data),
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
      
      // APIから受け取った勤怠データと勤務設定
      const apiAttendanceData = response.data.data?.attendanceData || {};
      const apiWorkSettings = response.data.data?.workSettings || workSettings;
      const apiMonthlyStats = response.data.data?.monthlyStats || {};
      
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
      const response = await api.post('/attendance/bulk-transportation-monthly', {
        amount: parseInt(transportationData.amount, 10) || 0,
        year: transportationData.year,
        month: transportationData.month,
        applyToAllDays: transportationData.applyToAllDays,
        applyToWorkingDaysOnly: transportationData.applyToWorkingDaysOnly
      });

      if (response.data.status === 'success') {
        await fetchMonthlyData();
        return response.data.message;
      }
    } catch (error) {
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
