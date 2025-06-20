const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get recent activities
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      take: 10,
      orderBy: {
        timestamp: 'desc'
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
    });

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.firstName} ${activity.user.lastName}`,
        email: activity.user.email
      } : null
    }));

    res.json({
      status: 'success',
      data: formattedActivities
    });  } catch (error) {
    next(error);
  }
});

// Get company-specific activities (COMPANY役割用)
router.get('/company', authenticate, authorize('COMPANY'), async (req, res, next) => {
  try {
    const companyId = req.user.managedCompanyId;
    
    if (!companyId) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { type: 'company' },
          { type: 'employee' },
          { type: 'project' },
          { type: 'skill' }
        ],
        user: {
          companyId: companyId
        }
      },
      take: 10,
      orderBy: {
        timestamp: 'desc'
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
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.firstName} ${activity.user.lastName}`,
        email: activity.user.email
      } : null
    }));

    res.json({
      status: 'success',
      data: formattedActivities
    });
  } catch (error) {
    next(error);
  }
});

// Get team-specific activities (MANAGER役割用)
router.get('/team', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 自分が管理しているプロジェクトのIDを取得
    const managedProjectIds = await prisma.projectMembership.findMany({
      where: { 
        userId: userId,
        isManager: true
      },
      select: { projectId: true }
    });

    const projectIds = managedProjectIds.map(p => p.projectId);
    
    // チームメンバーのIDを取得
    const teamMemberIds = await prisma.projectMembership.findMany({
      where: {
        projectId: { in: projectIds }
      },
      select: { userId: true }
    });

    const userIds = [...new Set(teamMemberIds.map(m => m.userId))];

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { type: 'project' },
          { type: 'skill' }
        ],
        user: {
          id: { in: userIds }
        }
      },
      take: 10,
      orderBy: {
        timestamp: 'desc'
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
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.firstName} ${activity.user.lastName}`,
        email: activity.user.email
      } : null
    }));

    res.json({
      status: 'success',
      data: formattedActivities
    });
  } catch (error) {
    next(error);
  }
});

// Get user's personal activities (MEMBER役割用)
router.get('/my', authenticate, authorize('MEMBER'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activities = await prisma.activity.findMany({
      where: {
        userId: userId
      },
      take: 10,
      orderBy: {
        timestamp: 'desc'
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
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.firstName} ${activity.user.lastName}`,
        email: activity.user.email
      } : null
    }));

    res.json({
      status: 'success',
      data: formattedActivities
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;