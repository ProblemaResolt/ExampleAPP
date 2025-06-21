const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/authentication');
const ApprovalController = require('../../controllers/attendance/ApprovalController');

const router = express.Router();

// 承認待ちの勤怠記録を取得（プロジェクト毎にグループ化）
router.get('/pending-approval',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    query('projectId').optional().isUUID().withMessage('有効なプロジェクトIDを入力してください'),
    query('userName').optional().isString().withMessage('ユーザー名は文字列で入力してください'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
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
  [
    body('reason').notEmpty().withMessage('却下理由は必須です')
  ],
  ApprovalController.rejectTimeEntry
);

// 一括承認
router.post('/bulk-approve',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    body('timeEntryIds').isArray({ min: 1 }).withMessage('承認対象のIDが必要です'),
    body('timeEntryIds.*').isUUID().withMessage('無効なIDが含まれています')
  ],
  ApprovalController.bulkApprove
);

// メンバーの承認待ち勤怠記録を一括処理
router.patch('/bulk-approve-member/:memberUserId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    body('action').isIn(['APPROVED', 'REJECTED']).withMessage('有効なアクションを指定してください'),
    body('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください')
  ],
  ApprovalController.bulkApproveMember
);

// メンバーの勤怠記録を一括却下
router.patch('/bulk-reject-member/:memberUserId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    body('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    body('reason').optional().isString().withMessage('却下理由は文字列で入力してください')
  ],
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
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('projectId').optional().isUUID().withMessage('有効なプロジェクトIDを入力してください')
  ],
  ApprovalController.getProjectMembersSummary
);

// 個人の月間勤怠データを詳細取得
router.get('/individual/:userId',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください')
  ],
  ApprovalController.getIndividualAttendance
);

// プロジェクト全体の勤怠データをExcelファイルとして出力
router.get('/export-project-excel',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('projectId').isUUID().withMessage('有効なプロジェクトIDを入力してください')
  ],
  ApprovalController.exportProjectToExcel
);

// 個人の勤怠データをExcelファイルとして出力
router.get('/export-member-excel',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('userId').isUUID().withMessage('有効なユーザーIDを入力してください')
  ],
  ApprovalController.exportMemberToExcel
);

// プロジェクト全体のPDF出力
router.get('/export-project-pdf',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('projectId').isUUID().withMessage('有効なプロジェクトIDを入力してください')
  ],
  ApprovalController.exportProjectToPdf
);

// メンバー個人のPDF出力
router.get('/export-member-pdf',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('year').isInt({ min: 2000, max: 3000 }).withMessage('有効な年を入力してください'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('有効な月を入力してください'),
    query('userId').isUUID().withMessage('有効なユーザーIDを入力してください')
  ],
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
  [
    body('reason').optional().isString().withMessage('却下理由は文字列で入力してください')
  ],
  ApprovalController.rejectIndividualTimeEntry
);

module.exports = router;
