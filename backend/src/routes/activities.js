const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');

const router = express.Router();
const prisma = new PrismaClient();

// Get recent activities (with company-based filtering)
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let whereCondition = {};

    // Apply company-based filtering based on user role
    if (userRole === 'ADMIN') {
      // ADMIN can see all activities (no filtering)
      whereCondition = {};
    } else if (userRole === 'COMPANY') {
      // COMPANY role can only see activities from their managed company
      if (!req.user.managedCompanyId) {
        return res.json({
          status: 'success',
          data: []
        });
      }
      whereCondition = {
        user: {
          companyId: req.user.managedCompanyId
        }
      };
    } else if (userRole === 'MANAGER') {
      // MANAGER role can only see activities from their company
      if (!req.user.companyId) {
        return res.json({
          status: 'success',
          data: []
        });
      }
      whereCondition = {
        user: {
          companyId: req.user.companyId
        }
      };
    } else if (userRole === 'MEMBER') {
      // MEMBER role can only see their own activities
      whereCondition = {
        userId: req.user.id
      };
    }

    const activities = await prisma.activity.findMany({
      where: whereCondition,
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
        name: `${activity.user.lastName} ${activity.user.firstName}`,
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

// Company activities endpoint
router.get('/company', authenticate, authorize('COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let whereCondition = {};

    if (userRole === 'COMPANY') {
      if (!req.user.managedCompanyId) {
        return res.json({
          status: 'success',
          data: []
        });
      }
      whereCondition = {
        user: {
          companyId: req.user.managedCompanyId
        }
      };
    } else if (userRole === 'MANAGER') {
      whereCondition = {
        user: {
          companyId: req.user.companyId
        }
      };
    }

    const activities = await prisma.activity.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.lastName} ${activity.user.firstName}`,
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

// Team activities endpoint
router.get('/team', authenticate, authorize('MANAGER'), async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        user: {
          companyId: req.user.companyId
        }
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
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.lastName} ${activity.user.firstName}`,
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

// My activities endpoint
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        userId: req.user.id
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
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.timestamp,
      user: activity.user ? {
        id: activity.user.id,
        name: `${activity.user.lastName} ${activity.user.firstName}`,
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