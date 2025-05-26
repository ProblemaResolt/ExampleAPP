const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

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
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 