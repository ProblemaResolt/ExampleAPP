import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LeaveManagement from '../components/LeaveManagement';
import LeaveBalanceManagement from '../components/LeaveBalanceManagement';
import ExcelExportForm from '../components/ExcelExportForm';
import WorkReportModal from '../components/WorkReportModal';
import AttendanceEditModal from '../components/AttendanceEditModal';
import BulkSettingsModal from '../components/BulkSettingsModal';
import BulkTransportationModal from '../components/BulkTransportationModal';
import WorkSettingsIntegratedManagement from '../components/WorkSettingsIntegratedManagement';
import AttendanceStats from '../components/AttendanceStats';
import AttendanceNavigation from '../components/AttendanceNavigation';
import AttendanceTabNavigation from '../components/AttendanceTabNavigation';
import AttendanceTable from '../components/AttendanceTable';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from '../components/Snackbar';
import { FaTimes, FaCalendarAlt } from 'react-icons/fa';
import api from '../utils/axios';

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

  // 月変更ハンドラー
  const handleMonthChange = (increment) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  // エクスポートハンドラー
  const handleExport = async (year, month) => {
    try {
      // TODO: エクスポート機能の実装
      setShowExportForm(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // 編集モーダルを開く
  const openEditModal = (dateString, field, currentValue) => {
    setEditModalConfig({
      show: true,
      dateString,
      field,
      currentValue,
      label: field
    });
  };

  // 編集モーダルを閉じる
  const closeEditModal = () => {
    setEditModalConfig({ show: false });
  };
  // 勤怠データ保存
  const saveAttendanceData = async (newValue) => {
    try {
      const { dateString, field } = editModalConfig;
        // 数値型フィールドの適切な変換
      let processedValue = newValue;
      if (field === 'breakTime' || field === 'transportationCost') {
        processedValue = parseInt(newValue, 10) || 0;
      } else if (field === 'clockIn' || field === 'clockOut') {
        // 時刻フィールドの場合、HH:MM形式のまま送信
        // バックエンドでJST時刻として処理される
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

  // 一括設定の適用
  const applyBulkSettings = async (settings) => {
    try {
      await fetchMonthlyData();
      setShowBulkSettings(false);
    } catch (error) {
      console.error('一括設定の適用に失敗しました:', error);
      showError('一括設定の適用に失敗しました。');
    }
  };

  return (
    <div className="w3-container w3-margin-top">
      {/* ヘッダー */}
      <div className="w3-card-4 w3-white w3-margin-bottom">
        <header className="w3-container w3-deep-purple w3-padding">
          <h2>勤怠管理システム</h2>
          <p>出退勤時刻の記録と月次勤怠データの管理ページです</p>
        </header>
      </div>

      {/* タブナビゲーション */}
      <AttendanceTabNavigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={user?.role}
      />

      {/* タブコンテンツ */}
      {activeTab === 'attendance' && (
        <>
          {/* 統計情報 */}
          <AttendanceStats 
            monthlyStats={monthlyStats}
            currentDate={currentDate}
          />          {/* 月ナビゲーション */}
          <AttendanceNavigation 
            currentDate={currentDate}
            onPreviousMonth={() => handleMonthChange(-1)}
            onNextMonth={() => handleMonthChange(1)}
            onRefresh={handleRefresh}
            onBulkSettings={() => setShowBulkSettings(true)}
            onExport={() => setShowExportForm(true)}
            onLeaveForm={() => setShowLeaveForm(true)}
            onBulkTransportation={() => setShowBulkTransportation(true)}
          />

          {/* 勤怠表 */}
          <AttendanceTable 
            currentDate={currentDate}
            attendanceData={attendanceData}
            workSettings={workSettings}
            loading={loading}
            onEditCell={openEditModal}
            onShowWorkReport={(date) => {
              setSelectedDate(date);
              setShowWorkReport(true);
            }}
          />
        </>
      )}

      {/* 休暇管理タブ */}
      {activeTab === 'leave' && (
        <div className="w3-card-4 w3-white">
          <header className="w3-container w3-green w3-padding">
            <h3>
              <FaCalendarAlt className="w3-margin-right" />
              休暇管理
            </h3>
          </header>
          <div className="w3-container w3-padding">
            <LeaveManagement
              userId={user?.id}
              userRole={user?.role}
            />
          </div>
        </div>
      )}      {/* 勤務設定管理タブ */}
      {activeTab === 'settings' && (user?.role === 'ADMIN' || user?.role === 'COMPANY' || user?.role === 'MANAGER') && (
        <div className="w3-margin-top">
          <WorkSettingsIntegratedManagement />
        </div>
      )}

      {/* 有給残高管理タブ */}
      {activeTab === 'leaveBalance' && (user?.role === 'ADMIN' || user?.role === 'COMPANY') && (
        <div className="w3-card-4 w3-white">
          <header className="w3-container w3-teal w3-padding">
            <h3>
              <FaCalendarAlt className="w3-margin-right" />
              有給残高管理
            </h3>
          </header>
          <div className="w3-container w3-padding">
            <LeaveBalanceManagement
              userRole={user?.role}
              managedCompanyId={user?.managedCompanyId}
            />
          </div>
        </div>
      )}

      {/* モーダル類 */}
      {editModalConfig.show && (
        <AttendanceEditModal
          config={editModalConfig}
          onSave={saveAttendanceData}
          onClose={closeEditModal}
          workSettings={workSettings}
        />
      )}

      {showBulkSettings && (
        <BulkSettingsModal
          isOpen={showBulkSettings}
          onClose={() => setShowBulkSettings(false)}
          onSave={applyBulkSettings}
          workSettings={workSettings}
          currentMonth={currentDate.getMonth() + 1}
          currentYear={currentDate.getFullYear()}
        />
      )}      {showBulkTransportation && (
        <BulkTransportationModal
          isOpen={showBulkTransportation}
          onClose={() => setShowBulkTransportation(false)}
          onSave={saveBulkTransportation}
          currentMonth={currentDate.getMonth() + 1}
          currentYear={currentDate.getFullYear()}
          workSettings={workSettings}
        />
      )}

      {showLeaveForm && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '900px', margin: '5% auto' }}>
            <header className="w3-container w3-indigo">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setShowLeaveForm(false)}
              >
                <FaTimes />
              </span>
              <h3>休暇申請</h3>
            </header>
            <div className="w3-container w3-padding">
              <LeaveManagement
                userId={user?.id}
                userRole={user?.role}
              />
            </div>
          </div>
        </div>
      )}      {showWorkReport && (
        <WorkReportModal
          date={selectedDate}
          onClose={() => setShowWorkReport(false)}
          onSave={fetchMonthlyData}
          updateWorkReport={updateWorkReport}
        />
      )}

      {showExportForm && (
        <div className="w3-modal" style={{ display: 'block' }}>
          <div className="w3-modal-content w3-animate-top w3-card-4" style={{ maxWidth: '600px', margin: '5% auto' }}>
            <header className="w3-container w3-indigo">
              <span 
                className="w3-button w3-display-topright w3-hover-red"
                onClick={() => setShowExportForm(false)}
              >
                <FaTimes />
              </span>
              <h3>エクスポート</h3>
            </header>
            <div className="w3-container w3-padding">
              <ExcelExportForm
                currentYear={currentDate.getFullYear()}
                currentMonth={currentDate.getMonth() + 1}
                onExport={handleExport}
                onCancel={() => setShowExportForm(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      <Snackbar
        message={snackbar.message}
        severity={snackbar.severity}
        isOpen={snackbar.isOpen}
        onClose={hideSnackbar}
      />
    </div>
  );
};

export default AttendanceManagement;
