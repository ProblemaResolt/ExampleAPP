import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from '../components/Snackbar';
import { FaCalendarAlt, FaUsers, FaChartBar, FaClipboardList } from 'react-icons/fa';

// 共通コンポーネント
import Card from '../components/common/Card';
import TabNavigation from '../components/common/TabNavigation';
import MonthNavigation from '../components/common/MonthNavigation';
import StatsSummary from '../components/common/StatsSummary';
import Loading from '../components/common/Loading';

// 勤怠関連コンポーネント
import AttendanceToolbar from '../components/attendance/AttendanceToolbar';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceEditModal from '../components/AttendanceEditModal';
import WorkReportModal from '../components/WorkReportModal';
import BulkSettingsModal from '../components/BulkSettingsModal';
import BulkTransportationModal from '../components/BulkTransportationModal';
import WorkSettingsIntegratedManagement from '../components/WorkSettingsIntegratedManagement';
import ExcelExportForm from '../components/ExcelExportForm';
import LeaveManagement from '../components/LeaveManagement';
import LeaveBalanceManagement from '../components/LeaveBalanceManagement';

const AttendanceManagement = () => {
  const { user } = useAuth();
  const { snackbar, showError, hideSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState('attendance');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // カスタムフックを使用してデータ管理
  const {
    attendanceData,
    workSettings,
    loading,
    monthlyStats,
    leaveRequests,
    editingCell,
    setEditingCell,
    fetchMonthlyData,
    updateAttendance,
    handleRefresh,
    approveLeave,
    rejectLeave,
    updateWorkReport,
    saveBulkTransportation
  } = useAttendanceData(currentDate, user);

  // モーダル状態管理
  const [showSettings, setShowSettings] = useState(false);
  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [showBulkTransportation, setShowBulkTransportation] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showWorkReport, setShowWorkReport] = useState(false);
  const [showExportForm, setShowExportForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editModalConfig, setEditModalConfig] = useState({ show: false });

  // タブ定義
  const tabs = [
    { 
      id: 'attendance', 
      label: '勤怠管理', 
      icon: <FaCalendarAlt /> 
    },
    { 
      id: 'leave', 
      label: '休暇申請', 
      icon: <FaClipboardList />,
      badge: leaveRequests?.filter(req => req.status === 'PENDING').length
    },
    { 
      id: 'leaveBalance', 
      label: '休暇残高', 
      icon: <FaChartBar /> 
    },
    ...(user?.role === 'MANAGER' || user?.role === 'COMPANY' ? [
      { 
        id: 'teamManagement', 
        label: 'チーム管理', 
        icon: <FaUsers /> 
      }
    ] : [])
  ];

  // 月変更ハンドラー
  const handleMonthChange = (increment) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handlePreviousMonth = () => handleMonthChange(-1);
  const handleNextMonth = () => handleMonthChange(1);

  // モーダル制御
  const openEditModal = (dateString, field, currentValue) => {
    setEditModalConfig({
      show: true,
      dateString,
      field,
      currentValue,
      label: field
    });
  };

  const closeEditModal = () => {
    setEditModalConfig({ show: false });
  };

  const saveAttendanceData = async (newValue) => {
    try {
      const { dateString, field } = editModalConfig;
      let processedValue = newValue;
      
      if (field === 'breakTime' || field === 'transportationCost') {
        processedValue = parseInt(newValue, 10) || 0;
      } else if (field === 'clockIn' || field === 'clockOut') {
        processedValue = newValue;
      }
      
      const updateData = { 
        date: dateString,
        [field]: processedValue 
      };

      await updateAttendance(updateData);
      closeEditModal();
    } catch (error) {
      console.error('勤怠データの保存に失敗しました:', error);
      showError('保存に失敗しました。もう一度お試しください。');
    }
  };

  const applyBulkSettings = async (settings) => {
    try {
      await fetchMonthlyData();
      setShowBulkSettings(false);
    } catch (error) {
      console.error('一括設定の適用に失敗しました:', error);
      showError('一括設定の適用に失敗しました。');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="w3-container w3-margin-top">
      {/* ヘッダー */}
      <Card
        title="勤怠管理システム"
        subtitle="出退勤時刻の記録と月次勤怠データの管理ページ"
        headerColor="w3-deep-purple"
      >
        {/* タブナビゲーション */}
        <TabNavigation 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* タブコンテンツ */}
        {activeTab === 'attendance' && (
          <>
            {/* 月次統計 */}
            <StatsSummary stats={monthlyStats} />

            {/* 月ナビゲーション */}
            <MonthNavigation
              currentDate={currentDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
            />

            {/* ツールバー */}
            <AttendanceToolbar
              onSettingsClick={() => setShowSettings(true)}
              onBulkSettingsClick={() => setShowBulkSettings(true)}
              onExportClick={() => setShowExportForm(true)}
              onWorkReportClick={() => setShowWorkReport(true)}
              onBulkTransportationClick={() => setShowBulkTransportation(true)}
              showManagerActions={user?.role === 'MANAGER' || user?.role === 'COMPANY'}
              userRole={user?.role}
            />

            {/* 勤怠テーブル */}
            <div className="w3-card">
              <AttendanceTable
                attendanceData={attendanceData}
                onEditCell={openEditModal}
                currentDate={currentDate}
                userRole={user?.role}
              />
            </div>
          </>
        )}

        {activeTab === 'leave' && (
          <LeaveManagement 
            leaveRequests={leaveRequests}
            onApprove={approveLeave}
            onReject={rejectLeave}
            userRole={user?.role}
          />
        )}

        {activeTab === 'leaveBalance' && (
          <LeaveBalanceManagement 
            userId={user?.id}
          />
        )}

        {activeTab === 'teamManagement' && (user?.role === 'MANAGER' || user?.role === 'COMPANY') && (
          <div className="w3-container w3-padding">
            <h3>チーム勤怠管理</h3>
            <p>チームメンバーの勤怠状況を確認できます。</p>
            {/* チーム管理コンポーネントをここに追加 */}
          </div>
        )}
      </Card>

      {/* モーダル群 */}
      {editModalConfig.show && (
        <AttendanceEditModal
          show={editModalConfig.show}
          field={editModalConfig.field}
          label={editModalConfig.label}
          currentValue={editModalConfig.currentValue}
          onSave={saveAttendanceData}
          onClose={closeEditModal}
        />
      )}

      {showSettings && (
        <WorkSettingsIntegratedManagement
          onClose={() => setShowSettings(false)}
        />
      )}

      {showBulkSettings && (
        <BulkSettingsModal
          currentDate={currentDate}
          onClose={() => setShowBulkSettings(false)}
          onApply={applyBulkSettings}
        />
      )}

      {showBulkTransportation && (
        <BulkTransportationModal
          currentDate={currentDate}
          onClose={() => setShowBulkTransportation(false)}
          onSave={saveBulkTransportation}
        />
      )}

      {showWorkReport && (
        <WorkReportModal
          selectedDate={selectedDate}
          onClose={() => setShowWorkReport(false)}
          onSave={updateWorkReport}
        />
      )}

      {showExportForm && (
        <ExcelExportForm
          onClose={() => setShowExportForm(false)}
          onExport={(year, month) => {
            // TODO: エクスポート機能の実装
            setShowExportForm(false);
          }}
        />
      )}

      <Snackbar {...snackbar} onClose={hideSnackbar} />
    </div>
  );
};

export default AttendanceManagement;
