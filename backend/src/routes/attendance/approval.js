const express = require('express');
const { authenticate, authorize } = require('../../middleware/authentication');
const ApprovalController = require('../../controllers/attendance/ApprovalController');
const AttendanceValidator = require('../../validators/AttendanceValidator');
const CommonValidationRules = require('../../validators/CommonValidationRules');

const router = express.Router();

// 承認待ちの勤怠記録を取得（プロジェクト毎にグループ化）
router.get('/pending-approval',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.pendingApprovalQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.getPendingApprovals
);

// 勤怠記録を承認
router.patch('/approve/:timeEntryId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  ApprovalController.approveTimeEntry
);

// 勤怠記録を却下
router.patch('/reject/:timeEntryId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.rejectTimeEntry,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.rejectTimeEntry
);

// 一括承認
router.post('/bulk-approve',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.bulkApprove,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.bulkApprove
);

// メンバーの承認待ち勤怠記録を一括処理
router.patch('/bulk-approve-member/:memberUserId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.bulkApproveMember,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.bulkApproveMember
);

// メンバーの勤怠記録を一括却下
router.patch('/bulk-reject-member/:memberUserId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.bulkRejectMember,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.bulkRejectMember
);

// 承認対象のプロジェクト一覧を取得
router.get('/approval-projects',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  ApprovalController.getProjectsWithPendingApprovals
);

// プロジェクト毎のメンバー月間サマリーを取得
router.get('/project-members-summary',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.projectMembersSummaryQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.getProjectMembersSummary
);

// 個人の月間勤怠データを詳細取得
router.get('/individual/:userId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.individualAttendanceQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.getIndividualAttendance
);

// プロジェクト全体の勤怠データをExcelファイルとして出力
router.get('/export-project-excel',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.exportProjectExcelQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.exportProjectToExcel
);

// 個人の勤怠データをExcelファイルとして出力
router.get('/export-member-excel',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.exportMemberExcelQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.exportMemberToExcel
);

// プロジェクト全体のPDF出力
router.get('/export-project-pdf',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.exportProjectPdfQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.exportProjectToPdf
);

// メンバー個人のPDF出力
router.get('/export-member-pdf',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.exportMemberPdfQuery,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.exportMemberToPdf
);

// 個別の勤怠記録を承認
router.patch('/time-entry/:timeEntryId/approve',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  ApprovalController.approveIndividualTimeEntry
);

// 個別の勤怠記録を却下
router.patch('/time-entry/:timeEntryId/reject',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  AttendanceValidator.rejectIndividualTimeEntry,
  (req, res, next) => {
    CommonValidationRules.handleValidationErrors(req);
    next();
  },
  ApprovalController.rejectIndividualTimeEntry
);

module.exports = router;
