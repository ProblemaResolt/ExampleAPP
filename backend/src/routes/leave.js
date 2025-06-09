const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');
const { AppError } = require('../middleware/error');

const prisma = new PrismaClient();
const router = express.Router();

// 有給休暇申請
router.post('/leave-request',
  authenticate,
  [
    body('leaveType').isIn(['PAID_LEAVE', 'SICK_LEAVE', 'PERSONAL_LEAVE', 'MATERNITY', 'PATERNITY', 'SPECIAL', 'UNPAID']).withMessage('有効な休暇タイプを選択してください'),
    body('startDate').isISO8601().withMessage('有効な開始日を入力してください'),
    body('endDate').isISO8601().withMessage('有効な終了日を入力してください'),
    body('days').isFloat({ min: 0.5 }).withMessage('休暇日数は0.5日以上で入力してください'),
    body('reason').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }      const { leaveType, startDate, endDate, days, reason } = req.body;
      const userId = req.user.id;      // 日付の妥当性チェック
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new AppError('開始日は終了日より前の日付を選択してください', 400);
      }

      // 有給残高チェック（年次有給の場合）
      if (leaveType === 'PAID_LEAVE') {
        const currentYear = new Date().getFullYear();
        let leaveBalance = await prisma.leaveBalance.findFirst({
          where: {
            userId,
            year: currentYear,
            leaveType: 'PAID_LEAVE'
          }
        });

        // 有給残高がない場合、自動で初期化（開発環境用）
        if (!leaveBalance) {
          console.log(`📝 ユーザー ${userId} の ${currentYear}年度有給残高を自動初期化`);
          leaveBalance = await prisma.leaveBalance.create({
            data: {
              userId,
              year: currentYear,
              leaveType: 'PAID_LEAVE',
              totalDays: 20, // デフォルト20日
              usedDays: 0,
              remainingDays: 20,
              expiryDate: new Date(currentYear + 1, 3, 31) // 翌年4月末まで
            }
          });
          console.log(`✅ 有給残高初期化完了: ${leaveBalance.remainingDays}日`);
        }

        if (leaveBalance.remainingDays < days) {
          throw new AppError(`有給休暇の残日数が不足しています（残り: ${leaveBalance.remainingDays}日、申請: ${days}日）`, 400);
        }
      }

      // 重複する休暇申請のチェック
      const existingRequest = await prisma.leaveRequest.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startDate: { lte: end },
              endDate: { gte: start }
            }
          ]
        }
      });

      if (existingRequest) {
        throw new AppError('指定期間に重複する休暇申請があります', 400);
      }

      // 休暇申請を作成
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId,
          leaveType,
          startDate: start,
          endDate: end,
          days,
          reason,
          status: 'PENDING'
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data: { leaveRequest },
        message: '休暇申請を作成しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇申請一覧取得
router.get('/leave-requests',
  authenticate,
  async (req, res, next) => {
    try {
      const { 
        userId: targetUserId, 
        status, 
        leaveType,
        startDate, 
        endDate,
        page = 1, 
        limit = 20 
      } = req.query;
      
      const userId = req.user.id;
      const userRole = req.user.role;      // 権限チェックとクエリ条件の構築
      let where = {};
      
      if (targetUserId && targetUserId !== userId) {
        // 特定ユーザーの申請を取得する場合
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの休暇申請を閲覧する権限がありません', 403);
        }

        // 管理者権限の場合は対象ユーザーを設定
        if (userRole === 'COMPANY') {
          // 会社管理者は自社のユーザーのみ
          const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { companyId: true }
          });
          if (!targetUser || targetUser.companyId !== req.user.managedCompanyId) {
            throw new AppError('指定されたユーザーにアクセスする権限がありません', 403);
          }
        } else if (userRole === 'MANAGER') {
          // マネージャーは部下のみ
          const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { managerId: true }
          });
          if (!targetUser || targetUser.managerId !== req.user.id) {
            throw new AppError('指定されたユーザーにアクセスする権限がありません', 403);
          }
        }
        where.userId = targetUserId;      } else {
        // targetUserIdが指定されていない場合の処理
        if (userRole === 'ADMIN') {
          // 管理者は全ユーザーの申請を見ることができる
          // where条件にuserIdを設定しない（全ユーザー）
        } else if (userRole === 'COMPANY') {
          // 会社管理者は自社のユーザーの申請のみ
          console.log(`🔍 COMPANY権限ユーザー ${userId} が管理する会社ID: ${req.user.managedCompanyId}`);
          const companyUsers = await prisma.user.findMany({
            where: { companyId: req.user.managedCompanyId },
            select: { id: true, firstName: true, lastName: true }
          });
          const companyUserIds = companyUsers.map(user => user.id);
          console.log(`📋 会社所属ユーザー数: ${companyUsers.length}`);
          console.log(`📋 会社所属ユーザー詳細:`, companyUsers);
          console.log(`📋 ユーザーID一覧:`, companyUserIds);
          where.userId = { in: companyUserIds };
        } else if (userRole === 'MANAGER') {
          // マネージャーは部下の申請のみ
          const subordinates = await prisma.user.findMany({
            where: { managerId: req.user.id },
            select: { id: true }
          });
          const subordinateIds = subordinates.map(user => user.id);
          where.userId = { in: subordinateIds };        } else {
          // 一般ユーザーは自分の申請のみ
          where.userId = userId;
        }
      }

      // 追加フィルタ条件を適用
      if (status) where.status = status;
      if (leaveType) where.leaveType = leaveType;
      if (startDate) where.startDate = { gte: new Date(startDate) };
      if (endDate) where.endDate = { lte: new Date(endDate) };

      console.log(`🔍 最終的なクエリ条件:`, JSON.stringify(where, null, 2));

      // ページネーション
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [leaveRequests, totalCount] = await Promise.all([
        prisma.leaveRequest.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            approver: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { requestedAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.leaveRequest.count({ where })
      ]);

      console.log(`📊 クエリ結果: ${leaveRequests.length}件の申請を取得 (合計: ${totalCount}件)`);
      if (leaveRequests.length > 0) {
        console.log(`📝 最初の申請詳細:`, {
          id: leaveRequests[0].id,
          userId: leaveRequests[0].userId,
          status: leaveRequests[0].status,
          leaveType: leaveRequests[0].leaveType,
          userName: `${leaveRequests[0].user.firstName} ${leaveRequests[0].user.lastName}`
        });
      }      // キャッシュ制御ヘッダーを追加
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        status: 'success',
        data: {
          leaveRequests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇申請詳細取得
router.get('/leave-request/:requestId',
  authenticate,
  async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!leaveRequest) {
        throw new AppError('休暇申請が見つかりません', 404);
      }

      // 権限チェック（申請者本人または管理者のみ）
      const isOwner = leaveRequest.userId === userId;
      const hasPermission = isOwner || ['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole);

      if (!hasPermission) {
        throw new AppError('この休暇申請を閲覧する権限がありません', 403);
      }

      res.json({
        status: 'success',
        data: { leaveRequest }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇申請編集
router.put('/leave-request/:requestId',
  authenticate,
  [
    body('leaveType').isIn(['PAID_LEAVE', 'SICK_LEAVE', 'PERSONAL_LEAVE', 'MATERNITY', 'PATERNITY', 'SPECIAL', 'UNPAID']).withMessage('有効な休暇タイプを選択してください'),
    body('startDate').isISO8601().withMessage('有効な開始日を入力してください'),
    body('endDate').isISO8601().withMessage('有効な終了日を入力してください'),
    body('days').isFloat({ min: 0.5 }).withMessage('休暇日数は0.5日以上で入力してください'),
    body('reason').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { requestId } = req.params;
      const { leaveType, startDate, endDate, days, reason } = req.body;
      const userId = req.user.id;

      // 既存の申請を確認
      const existingRequest = await prisma.leaveRequest.findUnique({
        where: { id: requestId }
      });

      if (!existingRequest) {
        throw new AppError('休暇申請が見つかりません', 404);
      }

      // 権限チェック（申請者本人のみ、PENDING状態のみ編集可能）
      if (existingRequest.userId !== userId) {
        throw new AppError('この休暇申請を編集する権限がありません', 403);
      }

      if (existingRequest.status !== 'PENDING') {
        throw new AppError('承認済みまたは拒否済みの申請は編集できません', 400);
      }

      // 日付の妥当性チェック
      const start = new Date(startDate);
      const end = new Date(endDate);
        if (start > end) {
        throw new AppError('開始日は終了日より前の日付を選択してください', 400);
      }      // 有給残高チェック（年次有給の場合）
      if (leaveType === 'PAID_LEAVE') {
        const currentYear = new Date().getFullYear();
        let leaveBalance = await prisma.leaveBalance.findFirst({
          where: {
            userId,
            year: currentYear,
            leaveType: 'PAID_LEAVE'
          }
        });

        // 有給残高がない場合、自動で初期化（開発環境用）
        if (!leaveBalance) {
          console.log(`📝 ユーザー ${userId} の ${currentYear}年度有給残高を自動初期化（更新時）`);
          leaveBalance = await prisma.leaveBalance.create({
            data: {
              userId,
              year: currentYear,
              leaveType: 'PAID_LEAVE',
              totalDays: 20, // デフォルト20日
              usedDays: 0,
              remainingDays: 20,
              expiryDate: new Date(currentYear + 1, 3, 31) // 翌年4月末まで
            }
          });
          console.log(`✅ 有給残高初期化完了: ${leaveBalance.remainingDays}日`);
        }

        if (leaveBalance.remainingDays < days) {
          throw new AppError(`有給休暇の残日数が不足しています（残り: ${leaveBalance.remainingDays}日、申請: ${days}日）`, 400);
        }
      }

      // 重複する休暇申請のチェック（自分以外）
      const conflictingRequest = await prisma.leaveRequest.findFirst({
        where: {
          userId,
          id: { not: requestId },
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startDate: { lte: end },
              endDate: { gte: start }
            }
          ]
        }
      });

      if (conflictingRequest) {
        throw new AppError('指定期間に重複する休暇申請があります', 400);
      }

      // 休暇申請を更新
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          leaveType,
          startDate: start,
          endDate: end,
          days,
          reason
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { leaveRequest: updatedRequest },
        message: '休暇申請を更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇申請削除
router.delete('/leave-request/:requestId',
  authenticate,
  async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      // 申請を確認
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: requestId }
      });

      if (!leaveRequest) {
        throw new AppError('休暇申請が見つかりません', 404);
      }

      // 権限チェック（申請者本人のみ、PENDING状態のみ削除可能）
      if (leaveRequest.userId !== userId) {
        throw new AppError('この休暇申請を削除する権限がありません', 403);
      }

      if (leaveRequest.status !== 'PENDING') {
        throw new AppError('承認済みまたは拒否済みの申請は削除できません', 400);
      }

      // 申請を削除
      await prisma.leaveRequest.delete({
        where: { id: requestId }
      });

      res.json({
        status: 'success',
        message: '休暇申請を削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇申請承認・拒否
router.patch('/leave-request/:requestId/approve',
  authenticate,
  authorize('MANAGER', 'COMPANY', 'ADMIN'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('有効なアクションを選択してください'),
    body('rejectReason').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { requestId } = req.params;
      const { action, rejectReason } = req.body;
      const approverId = req.user.id;

      // 申請を確認
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true
        }
      });

      if (!leaveRequest) {
        throw new AppError('休暇申請が見つかりません', 404);
      }

      if (leaveRequest.status !== 'PENDING') {
        throw new AppError('この申請は既に処理済みです', 400);
      }

      // 権限チェック（会社管理者は自社のユーザーのみ、マネージャーは部下のみ）
      if (req.user.role === 'COMPANY' && leaveRequest.user.companyId !== req.user.managedCompanyId) {
        throw new AppError('この休暇申請を承認する権限がありません', 403);
      }

      if (req.user.role === 'MANAGER' && leaveRequest.user.managerId !== req.user.id) {
        throw new AppError('この休暇申請を承認する権限がありません', 403);
      }      // 承認の場合、有給残高を減算（年次有給の場合）
      if (action === 'approve' && leaveRequest.leaveType === 'PAID_LEAVE') {
        const currentYear = new Date().getFullYear();
        await prisma.leaveBalance.updateMany({
          where: {
            userId: leaveRequest.userId,
            year: currentYear,
            leaveType: 'PAID_LEAVE'
          },
          data: {
            usedDays: { increment: leaveRequest.days },
            remainingDays: { decrement: leaveRequest.days }
          }
        });
      }

      // 申請を更新
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approvedBy: approverId,
          approvedAt: action === 'approve' ? new Date() : null,
          rejectedAt: action === 'reject' ? new Date() : null,
          rejectReason: action === 'reject' ? rejectReason : null
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { leaveRequest: updatedRequest },
        message: action === 'approve' ? '休暇申請を承認しました' : '休暇申請を拒否しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 有給残高取得
router.get('/leave-balance',
  authenticate,
  async (req, res, next) => {
    try {
      const { userId: targetUserId, year } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの有給残高を閲覧する権限がありません', 403);
        }
        queryUserId = targetUserId;
      }

      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      const leaveBalances = await prisma.leaveBalance.findMany({
        where: {
          userId: queryUserId,
          year: targetYear
        },
        orderBy: { leaveType: 'asc' }
      });

      res.json({
        status: 'success',
        data: { leaveBalances, year: targetYear }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 有給残高設定（管理者用）
router.post('/leave-balance/initialize',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  [
    body('userId').notEmpty().withMessage('ユーザーIDは必須です'),    body('year').isInt({ min: 2020, max: 2030 }).withMessage('有効な年度を入力してください'),
    body('annualDays').isInt({ min: 0 }).withMessage('年次有給日数は0以上の整数で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }      const { userId: targetUserId, year, annualDays } = req.body;

      // 既存の残高があるかチェック
      const existingBalance = await prisma.leaveBalance.findFirst({
        where: {
          userId: targetUserId,
          year,
          leaveType: 'PAID_LEAVE'
        }
      });

      let leaveBalance;
      
      if (existingBalance) {
        // 既存残高がある場合は更新（使用日数はそのまま残す）
        const newRemainingDays = annualDays - existingBalance.usedDays;
        
        leaveBalance = await prisma.leaveBalance.update({
          where: { id: existingBalance.id },
          data: {
            totalDays: annualDays,
            remainingDays: Math.max(0, newRemainingDays), // 残日数は0以下にならないよう制限
            expiryDate: new Date(year + 1, 3, 31) // 翌年4月末まで
          }
        });
      } else {
        // 新規作成
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            userId: targetUserId,
            year,
            leaveType: 'PAID_LEAVE',
            totalDays: annualDays,
            usedDays: 0,
            remainingDays: annualDays,
            expiryDate: new Date(year + 1, 3, 31) // 翌年4月末まで
          }
        });
      }      res.status(201).json({
        status: 'success',
        data: { leaveBalance },
        message: existingBalance ? '有給残高を更新しました' : '有給残高を設定しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 休暇統計取得
router.get('/leave-stats',
  authenticate,
  async (req, res, next) => {
    try {
      const { 
        userId: targetUserId, 
        year = new Date().getFullYear() 
      } = req.query;
      
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの統計情報を閲覧する権限がありません', 403);
        }
        queryUserId = targetUserId;
      }

      const targetYear = parseInt(year);
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31);

      // 年間の休暇申請統計
      const leaveStats = await prisma.leaveRequest.groupBy({
        by: ['leaveType', 'status'],
        where: {
          userId: queryUserId,
          startDate: { gte: startDate },
          endDate: { lte: endDate }
        },
        _count: {
          id: true
        },
        _sum: {
          days: true
        }
      });

      // 月別統計
      const monthlyStats = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(targetYear, month, 1);
        const monthEnd = new Date(targetYear, month + 1, 0);
        
        const monthlyLeaves = await prisma.leaveRequest.findMany({
          where: {
            userId: queryUserId,
            status: 'APPROVED',
            OR: [
              {
                startDate: { gte: monthStart, lte: monthEnd }
              },
              {
                endDate: { gte: monthStart, lte: monthEnd }
              },
              {
                startDate: { lte: monthStart },
                endDate: { gte: monthEnd }
              }
            ]
          }
        });

        const totalDays = monthlyLeaves.reduce((sum, leave) => {
          // 月内の実際の休暇日数を計算
          const leaveStart = new Date(Math.max(leave.startDate, monthStart));
          const leaveEnd = new Date(Math.min(leave.endDate, monthEnd));
          const daysDiff = Math.max(0, (leaveEnd - leaveStart) / (1000 * 60 * 60 * 24) + 1);
          return sum + daysDiff;
        }, 0);

        monthlyStats.push({
          month: month + 1,
          totalDays: Math.round(totalDays * 100) / 100
        });      }

      // 有給残高
      const leaveBalance = await prisma.leaveBalance.findFirst({
        where: {
          userId: queryUserId,
          year: targetYear,
          leaveType: 'PAID_LEAVE'
        }
      });

      res.json({
        status: 'success',
        data: {
          year: targetYear,
          leaveStats,
          monthlyStats,
          leaveBalance,
          summary: {
            totalRequests: leaveStats.reduce((sum, stat) => sum + stat._count.id, 0),
            totalDays: Math.round(leaveStats.reduce((sum, stat) => sum + (stat._sum.days || 0), 0) * 100) / 100,
            approvedRequests: leaveStats.filter(stat => stat.status === 'APPROVED').reduce((sum, stat) => sum + stat._count.id, 0),
            approvedDays: Math.round(leaveStats.filter(stat => stat.status === 'APPROVED').reduce((sum, stat) => sum + (stat._sum.days || 0), 0) * 100) / 100
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
