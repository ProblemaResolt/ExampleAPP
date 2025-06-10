const express = require('express');
const { body, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const prisma = require('../lib/prisma');

const router = express.Router();

// Get project work settings
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const settings = await prisma.projectWorkSettings.findUnique({
      where: { projectId: parseInt(projectId) },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    if (!settings) {
      return res.status(404).json({
        status: 'error',
        message: 'プロジェクト作業設定が見つかりません'
      });
    }

    res.json({
      status: 'success',
      data: { settings }
    });
  } catch (error) {
    next(error);
  }
});

// Create or update project work settings
router.post('/:projectId', 
  authenticate, 
  authorize(['ADMIN', 'COMPANY']),
  [
    body('startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('開始時刻は HH:MM 形式で入力してください'),
    body('endTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('終了時刻は HH:MM 形式で入力してください'),
    body('breakTime').optional().isInt({ min: 0 }).withMessage('休憩時間は0以上の整数で入力してください'),
    body('defaultTransportationCost').optional().isInt({ min: 0 }).withMessage('交通費は0以上の整数で入力してください')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('バリデーションエラー', 400, errors.array());
      }

      const { projectId } = req.params;
      const { startTime, endTime, breakTime, defaultTransportationCost } = req.body;

      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        throw new AppError('プロジェクトが見つかりません', 404);
      }

      // Permission check
      if (req.user.role === 'COMPANY' && project.companyId !== req.user.managedCompanyId) {
        throw new AppError('権限がありません', 403);
      }

      const settings = await prisma.projectWorkSettings.upsert({
        where: { projectId: parseInt(projectId) },
        update: {
          startTime,
          endTime,
          breakTime,
          defaultTransportationCost
        },
        create: {
          projectId: parseInt(projectId),
          startTime,
          endTime,
          breakTime,
          defaultTransportationCost
        },
        include: {
          project: {
            select: { id: true, name: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { settings },
        message: 'プロジェクト作業設定を保存しました'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;