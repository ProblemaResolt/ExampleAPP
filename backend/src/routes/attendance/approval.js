const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authorize } = require('../../middleware/authentication');
const ApprovalController = require('../../controllers/attendance/ApprovalController');

const router = express.Router();

// 承認待ちの勤怠記録を取得
router.get('/pending-approval',
  authenticate,
  authorize('MANAGER', 'COMPANY'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    query('userId').optional().isUUID(),
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

module.exports = router;
