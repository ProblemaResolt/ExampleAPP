const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');
const { AppError } = require('../middleware/error');
const WorkScheduleValidator = require('../validators/WorkScheduleValidator');
const CommonValidationRules = require('../validators/CommonValidationRules');

const prisma = new PrismaClient();
const router = express.Router();

// 勤務スケジュール作成
router.post('/work-schedule',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkScheduleValidator.create,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const {
        name,
        standardHours,
        flexTimeStart,
        flexTimeEnd,
        coreTimeStart,
        coreTimeEnd,
        breakDuration = 60,
        overtimeThreshold = 8.0,
        isFlexTime = false,
        isDefault = false
      } = req.body;

      // 会社IDを取得（会社管理者の場合は自社、ADMINの場合は指定）
      let companyId;
      if (req.user.role === 'COMPANY') {
        companyId = req.user.managedCompanyId;
      } else if (req.user.role === 'ADMIN' && req.body.companyId) {
        companyId = req.body.companyId;
      } else {
        throw new AppError('会社IDが指定されていません', 400);
      }

      // デフォルト設定の場合、既存のデフォルトを無効化
      if (isDefault) {
        await prisma.workSchedule.updateMany({
          where: {
            companyId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      // 勤務スケジュールを作成
      const workSchedule = await prisma.workSchedule.create({
        data: {
          companyId,
          name,
          standardHours,
          flexTimeStart,
          flexTimeEnd,
          coreTimeStart,
          coreTimeEnd,
          breakDuration,
          overtimeThreshold,
          isFlexTime,
          isDefault
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data: { workSchedule },
        message: '勤務スケジュールを作成しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務スケジュール一覧取得
router.get('/work-schedules',
  authenticate,
  async (req, res, next) => {
    try {
      const { companyId } = req.query;
      const userRole = req.user.role;

      // 権限に応じた会社IDの設定
      let queryCompanyId;
      if (userRole === 'COMPANY') {
        queryCompanyId = req.user.managedCompanyId;
      } else if (userRole === 'ADMIN') {
        queryCompanyId = companyId; // ADMINは任意の会社を指定可能
      } else {
        queryCompanyId = req.user.companyId; // 一般ユーザーは自社のみ
      }

      const workSchedules = await prisma.workSchedule.findMany({
        where: queryCompanyId ? { companyId: queryCompanyId } : {},
        include: {
          company: {
            select: { id: true, name: true }
          },
          _count: {
            userSchedules: true
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      res.json({
        status: 'success',
        data: { workSchedules }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務スケジュール詳細取得
router.get('/work-schedule/:scheduleId',
  authenticate,
  async (req, res, next) => {
    try {
      const { scheduleId } = req.params;

      const workSchedule = await prisma.workSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          company: {
            select: { id: true, name: true }
          },
          userSchedules: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });

      if (!workSchedule) {
        throw new AppError('勤務スケジュールが見つかりません', 404);
      }

      // Permission check based on user role
      if (req.user.role === 'COMPANY') {
        if (workSchedule.companyId !== req.user.managedCompanyId) {
          throw new AppError('この勤務スケジュールにアクセスする権限がありません', 403);
        }
      } else if (req.user.role === 'MANAGER' || req.user.role === 'MEMBER') {
        if (workSchedule.companyId !== req.user.companyId) {
          throw new AppError('この勤務スケジュールにアクセスする権限がありません', 403);
        }
      }

      res.json({
        status: 'success',
        data: { workSchedule }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務スケジュール更新
router.put('/work-schedule/:scheduleId',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  WorkScheduleValidator.update,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { scheduleId } = req.params;
      const {
        name,
        standardHours,
        flexTimeStart,
        flexTimeEnd,
        coreTimeStart,
        coreTimeEnd,
        breakDuration,
        overtimeThreshold,
        isFlexTime,
        isDefault
      } = req.body;

      // 既存のスケジュールを確認
      const existingSchedule = await prisma.workSchedule.findUnique({
        where: { id: scheduleId }
      });

      if (!existingSchedule) {
        throw new AppError('勤務スケジュールが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && existingSchedule.companyId !== req.user.managedCompanyId) {
        throw new AppError('この勤務スケジュールを編集する権限がありません', 403);
      }

      // デフォルト設定の場合、既存のデフォルトを無効化
      if (isDefault && !existingSchedule.isDefault) {
        await prisma.workSchedule.updateMany({
          where: {
            companyId: existingSchedule.companyId,
            isDefault: true,
            id: { not: scheduleId }
          },
          data: {
            isDefault: false
          }
        });
      }

      // 勤務スケジュールを更新
      const updatedSchedule = await prisma.workSchedule.update({
        where: { id: scheduleId },
        data: {
          name,
          standardHours,
          flexTimeStart,
          flexTimeEnd,
          coreTimeStart,
          coreTimeEnd,
          breakDuration,
          overtimeThreshold,
          isFlexTime,
          isDefault
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { workSchedule: updatedSchedule },
        message: '勤務スケジュールを更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 勤務スケジュール削除
router.delete('/work-schedule/:scheduleId',
  authenticate,
  authorize('ADMIN', 'COMPANY'),
  async (req, res, next) => {
    try {
      const { scheduleId } = req.params;

      // 既存のスケジュールを確認
      const workSchedule = await prisma.workSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          _count: {
            userSchedules: true
          }
        }
      });

      if (!workSchedule) {
        throw new AppError('勤務スケジュールが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && workSchedule.companyId !== req.user.managedCompanyId) {
        throw new AppError('この勤務スケジュールを削除する権限がありません', 403);
      }

      // 使用中のスケジュールは削除不可
      if (workSchedule._count.userSchedules > 0) {
        throw new AppError('使用中の勤務スケジュールは削除できません', 400);
      }

      // デフォルトスケジュールは削除不可
      if (workSchedule.isDefault) {
        throw new AppError('デフォルトの勤務スケジュールは削除できません', 400);
      }

      // 勤務スケジュールを削除
      await prisma.workSchedule.delete({
        where: { id: scheduleId }
      });

      res.json({
        status: 'success',
        message: '勤務スケジュールを削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー勤務スケジュール割り当て
router.post('/user-work-schedule',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  WorkScheduleValidator.assignToUser,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { userId, workScheduleId, startDate, endDate } = req.body;

      // ユーザーと勤務スケジュールの確認
      const [user, workSchedule] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId }
        }),
        prisma.workSchedule.findUnique({
          where: { id: workScheduleId }
        })
      ]);

      if (!user) {
        throw new AppError('ユーザーが見つかりません', 404);
      }

      if (!workSchedule) {
        throw new AppError('勤務スケジュールが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY') {
        if (user.companyId !== req.user.managedCompanyId || workSchedule.companyId !== req.user.managedCompanyId) {
          throw new AppError('権限がありません', 403);
        }
      } else if (req.user.role === 'MANAGER') {
        if (user.managerId !== req.user.id) {
          throw new AppError('権限がありません', 403);
        }
      }

      // 日付の妥当性チェック
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      
      if (end && start > end) {
        throw new AppError('開始日は終了日より前の日付を選択してください', 400);
      }

      // 重複する期間のスケジュールがないかチェック
      const conflictingSchedule = await prisma.userWorkSchedule.findFirst({
        where: {
          userId,
          OR: [
            {
              startDate: { lte: end || new Date('2099-12-31') },
              endDate: { gte: start }
            },
            {
              startDate: { lte: end || new Date('2099-12-31') },
              endDate: null
            }
          ]
        }
      });

      if (conflictingSchedule) {
        throw new AppError('指定期間に重複する勤務スケジュールがあります', 400);
      }

      // ユーザー勤務スケジュールを作成
      const userWorkSchedule = await prisma.userWorkSchedule.create({
        data: {
          userId,
          workScheduleId,
          startDate: start,
          endDate: end
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workSchedule: {
            select: { id: true, name: true, standardHours: true, isFlexTime: true }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data: { userWorkSchedule },
        message: 'ユーザー勤務スケジュールを設定しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー勤務スケジュール一覧取得
router.get('/user-work-schedules',
  authenticate,
  async (req, res, next) => {
    try {
      const { userId: targetUserId } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの勤務スケジュールを閲覧する権限がありません', 403);
        }

        // Check if the target user belongs to the same company
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { companyId: true }
        });

        if (!targetUser) {
          throw new AppError('指定されたユーザーが見つかりません', 404);
        }

        // Additional permission checks based on role
        if (userRole === 'COMPANY') {
          if (targetUser.companyId !== req.user.managedCompanyId) {
            throw new AppError('指定されたユーザーの勤務スケジュールにアクセスする権限がありません', 403);
          }
        } else if (userRole === 'MANAGER') {
          if (targetUser.companyId !== req.user.companyId) {
            throw new AppError('指定されたユーザーの勤務スケジュールにアクセスする権限がありません', 403);
          }
        }

        queryUserId = targetUserId;
      }

      const userWorkSchedules = await prisma.userWorkSchedule.findMany({
        where: { userId: queryUserId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workSchedule: true
        },
        orderBy: { startDate: 'desc' }
      });

      res.json({
        status: 'success',
        data: { userWorkSchedules }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 現在の勤務スケジュール取得
router.get('/current-work-schedule',
  authenticate,
  async (req, res, next) => {
    try {
      const { userId: targetUserId } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      // 権限チェック
      let queryUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        if (!['ADMIN', 'COMPANY', 'MANAGER'].includes(userRole)) {
          throw new AppError('他のユーザーの勤務スケジュールを閲覧する権限がありません', 403);
        }

        // Check if the target user belongs to the same company
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { companyId: true }
        });

        if (!targetUser) {
          throw new AppError('指定されたユーザーが見つかりません', 404);
        }

        // Additional permission checks based on role
        if (userRole === 'COMPANY') {
          if (targetUser.companyId !== req.user.managedCompanyId) {
            throw new AppError('指定されたユーザーの勤務スケジュールにアクセスする権限がありません', 403);
          }
        } else if (userRole === 'MANAGER') {
          if (targetUser.companyId !== req.user.companyId) {
            throw new AppError('指定されたユーザーの勤務スケジュールにアクセスする権限がありません', 403);
          }
        }

        queryUserId = targetUserId;
      }

      const currentDate = new Date();

      // 現在有効な勤務スケジュールを取得
      const currentSchedule = await prisma.userWorkSchedule.findFirst({
        where: {
          userId: queryUserId,
          startDate: { lte: currentDate },
          OR: [
            { endDate: null },
            { endDate: { gte: currentDate } }
          ]
        },
        include: {
          workSchedule: true
        },
        orderBy: { startDate: 'desc' }
      });

      // スケジュールが設定されていない場合はデフォルトを取得
      if (!currentSchedule) {
        const user = await prisma.user.findUnique({
          where: { id: queryUserId },
          select: { companyId: true }
        });

        if (user?.companyId) {
          const defaultSchedule = await prisma.workSchedule.findFirst({
            where: {
              companyId: user.companyId,
              isDefault: true
            }
          });

          return res.json({
            status: 'success',
            data: { 
              workSchedule: defaultSchedule,
              isDefault: true
            }
          });
        }
      }

      res.json({
        status: 'success',
        data: { 
          userWorkSchedule: currentSchedule,
          isDefault: false
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー勤務スケジュール更新
router.put('/user-work-schedule/:userScheduleId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  WorkScheduleValidator.updateUserAssignment,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);

      const { userScheduleId } = req.params;
      const { startDate, endDate } = req.body;

      // 既存のスケジュールを確認
      const existingSchedule = await prisma.userWorkSchedule.findUnique({
        where: { id: userScheduleId },
        include: {
          user: true
        }
      });

      if (!existingSchedule) {
        throw new AppError('ユーザー勤務スケジュールが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && existingSchedule.user.companyId !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      } else if (req.user.role === 'MANAGER' && existingSchedule.user.managerId !== req.user.id) {
        throw new AppError('権限がありません', 403);
      }

      // 日付の妥当性チェック
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;
      
      if (end && start > end) {
        throw new AppError('開始日は終了日より前の日付を選択してください', 400);
      }

      // 重複する期間のスケジュールがないかチェック（自分以外）
      const conflictingSchedule = await prisma.userWorkSchedule.findFirst({
        where: {
          userId: existingSchedule.userId,
          id: { not: userScheduleId },
          OR: [
            {
              startDate: { lte: end || new Date('2099-12-31') },
              endDate: { gte: start }
            },
            {
              startDate: { lte: end || new Date('2099-12-31') },
              endDate: null
            }
          ]
        }
      });

      if (conflictingSchedule) {
        throw new AppError('指定期間に重複する勤務スケジュールがあります', 400);
      }

      // ユーザー勤務スケジュールを更新
      const updatedSchedule = await prisma.userWorkSchedule.update({
        where: { id: userScheduleId },
        data: {
          startDate: start,
          endDate: end
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          workSchedule: true
        }
      });

      res.json({
        status: 'success',
        data: { userWorkSchedule: updatedSchedule },
        message: 'ユーザー勤務スケジュールを更新しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザー勤務スケジュール削除
router.delete('/user-work-schedule/:userScheduleId',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER'),
  async (req, res, next) => {
    try {
      const { userScheduleId } = req.params;

      // 既存のスケジュールを確認
      const userWorkSchedule = await prisma.userWorkSchedule.findUnique({
        where: { id: userScheduleId },
        include: {
          user: true
        }
      });

      if (!userWorkSchedule) {
        throw new AppError('ユーザー勤務スケジュールが見つかりません', 404);
      }

      // 権限チェック
      if (req.user.role === 'COMPANY' && userWorkSchedule.user.companyId !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      } else if (req.user.role === 'MANAGER' && userWorkSchedule.user.managerId !== req.user.id) {
        throw new AppError('権限がありません', 403);
      }

      // ユーザー勤務スケジュールを削除
      await prisma.userWorkSchedule.delete({
        where: { id: userScheduleId }
      });

      res.json({
        status: 'success',
        message: 'ユーザー勤務スケジュールを削除しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
