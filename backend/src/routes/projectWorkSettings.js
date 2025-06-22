const express = require('express');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const prisma = require('../lib/prisma');
const ProjectWorkSettingsValidator = require('../validators/ProjectWorkSettingsValidator');

const router = express.Router();

// Get project work settings
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Get project with company info for permission check
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        company: { select: { id: true } },
        members: {
          where: { userId: req.user.id },
          select: { userId: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'プロジェクトが見つかりません'
      });
    }

    // Permission check based on user role
    let hasAccess = false;
    if (req.user.role === 'ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'COMPANY' && project.company.id === req.user.managedCompanyId) {
      hasAccess = true;
    } else if ((req.user.role === 'MANAGER' || req.user.role === 'MEMBER') && project.members.length > 0) {
      // User is a member of this project
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'このプロジェクトの勤務設定を閲覧する権限がありません'
      });
    }

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
  authenticate,   authorize(['ADMIN', 'COMPANY']),
  ProjectWorkSettingsValidator.update,
  async (req, res, next) => {
    try {
      CommonValidationRules.handleValidationErrors(req);

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