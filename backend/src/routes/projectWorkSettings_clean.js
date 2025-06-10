const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const prisma = require('../lib/prisma');

const router = express.Router();

// プロジェクト勤務設定取得
router.get('/project/:projectId/work-settings',
  authenticate,
  async (req, res, next) => {
    try {
      const { projectId } = req.params;

      // プロジェクトの存在確認と権限チェック
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) },
        include: {
          company: true,
          assignments: {
            where: { userId: req.user.id }
          }
        }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // 権限チェック
      const hasAccess = req.user.role === 'ADMIN' ||
        (req.user.role === 'COMPANY' && project.company.id === req.user.managedCompanyId) ||
        project.assignments.length > 0;

      if (!hasAccess) {
        throw new AppError('このプロジェクトの勤務設定を取得する権限がありません', 403);
      }

      // プロジェクト勤務設定を取得
      const workSettings = await prisma.projectWorkSettings.findMany({
        where: { projectId: parseInt(projectId) },
        include: {
          userAssignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        status: 'success',
        data: { workSettings }
      });
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト勤務設定作成
router.post('/project/:projectId/work-settings',
  authenticate,
  authorize(['ADMIN', 'COMPANY']),
  [
    body('name').trim().notEmpty().withMessage('設定名は必須です'),
    body('workStartTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('有効な開始時刻を入力してください'),
    body('workEndTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('有効な終了時刻を入力してください'),
    body('breakDuration').isInt({ min: 0 }).withMessage('休憩時間は0以上の整数である必要があります'),
    body('standardHours').isFloat({ min: 0 }).withMessage('標準労働時間は0以上の数値である必要があります'),
    body('overtimeThreshold').isFloat({ min: 0 }).withMessage('残業閾値は0以上の数値である必要があります')
  ],
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      // プロジェクトの存在確認と権限チェック
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) },
        include: { company: true }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      if (req.user.role === 'COMPANY' && project.company.id !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      }

      const workSettings = await prisma.projectWorkSettings.create({
        data: {
          ...req.body,
          projectId: parseInt(projectId)
        },
        include: {
          userAssignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data: { workSettings },
        message: 'プロジェクト勤務設定が作成されました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト勤務設定更新
router.put('/project/:projectId/work-settings/:settingId',
  authenticate,
  authorize(['ADMIN', 'COMPANY']),
  async (req, res, next) => {
    try {
      const { projectId, settingId } = req.params;

      // 設定の存在確認と権限チェック
      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: parseInt(settingId) },
        include: {
          project: { include: { company: true } }
        }
      });

      if (!workSettings || workSettings.projectId !== parseInt(projectId)) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      }

      const updatedSettings = await prisma.projectWorkSettings.update({
        where: { id: parseInt(settingId) },
        data: req.body,
        include: {
          userAssignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      res.json({
        status: 'success',
        data: { workSettings: updatedSettings },
        message: 'プロジェクト勤務設定が更新されました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト勤務設定削除
router.delete('/project/:projectId/work-settings/:settingId',
  authenticate,
  authorize(['ADMIN', 'COMPANY']),
  async (req, res, next) => {
    try {
      const { projectId, settingId } = req.params;

      // 設定の存在確認と権限チェック
      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: parseInt(settingId) },
        include: {
          project: { include: { company: true } }
        }
      });

      if (!workSettings || workSettings.projectId !== parseInt(projectId)) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      }

      await prisma.projectWorkSettings.delete({
        where: { id: parseInt(settingId) }
      });

      res.json({
        status: 'success',
        message: 'プロジェクト勤務設定が削除されました'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ユーザーをプロジェクト勤務設定に割り当て
router.post('/project/:projectId/work-settings/:settingId/assign',
  authenticate,
  authorize(['ADMIN', 'COMPANY']),
  [
    body('userIds').isArray().notEmpty().withMessage('ユーザーIDの配列が必要です'),
    body('startDate').isISO8601().withMessage('有効な開始日を入力してください'),
    body('endDate').optional().isISO8601().withMessage('有効な終了日を入力してください')
  ],
  async (req, res, next) => {
    try {
      const { projectId, settingId } = req.params;
      const { userIds, startDate, endDate } = req.body;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      // 設定の存在確認と権限チェック
      const workSettings = await prisma.projectWorkSettings.findUnique({
        where: { id: parseInt(settingId) },
        include: {
          project: { include: { company: true } }
        }
      });

      if (!workSettings || workSettings.projectId !== parseInt(projectId)) {
        throw new AppError('勤務設定が見つかりません', 404);
      }

      if (req.user.role === 'COMPANY' && workSettings.project.company.id !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      }

      // ユーザー割り当て作成
      const assignments = await Promise.all(
        userIds.map(userId =>
          prisma.userProjectWorkSettings.create({
            data: {
              userId: parseInt(userId),
              projectWorkSettingsId: parseInt(settingId),
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              isActive: true
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          })
        )
      );

      res.status(201).json({
        status: 'success',
        data: { assignments },
        message: 'ユーザーがプロジェクト勤務設定に割り当てられました'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
