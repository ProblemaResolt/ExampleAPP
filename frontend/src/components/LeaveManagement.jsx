import React from 'react';
import LeaveManagementDashboard from './leave/LeaveManagementDashboard';

const LeaveManagement = ({ userId, userRole }) => {
  return (
    <LeaveManagementDashboard userId={userId} userRole={userRole} />
  );
};

export default LeaveManagement;
