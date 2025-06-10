const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();
const prisma = new PrismaClient();

// Get all global skills with categories
router.get('/global', authenticate, authorize(['ADMIN']), async (req, res, next) => {
  try {
    const { category, search } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const globalSkills = await prisma.globalSkill.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { companySelectedSkills: true }
        }
      }
    });

    // Group by category
    const categories = {};
    globalSkills.forEach(skill => {
      const cat = skill.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({
        ...skill,
        usageCount: skill._count.companySelectedSkills
      });
    });

    res.json({
      status: 'success',
      data: {
        skills: globalSkills,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create global skill
router.post('/global', authenticate, authorize(['ADMIN']), [
  body('name').trim().notEmpty().withMessage('スキル名は必須です'),
  body('category').trim().notEmpty().withMessage('カテゴリは必須です'),
  body('description').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const { name, category, description } = req.body;

    const globalSkill = await prisma.globalSkill.create({
      data: { name, category, description }
    });

    res.status(201).json({
      status: 'success',
      data: { globalSkill },
      message: 'グローバルスキルが作成されました'
    });
  } catch (error) {
    next(error);
  }
});

// Update global skill
router.put('/global/:id', authenticate, authorize(['ADMIN']), [
  body('name').trim().notEmpty().withMessage('スキル名は必須です'),
  body('category').trim().notEmpty().withMessage('カテゴリは必須です'),
  body('description').optional().trim()
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const globalSkill = await prisma.globalSkill.update({
      where: { id: parseInt(id) },
      data: req.body
    });

    res.json({
      status: 'success',
      data: { globalSkill },
      message: 'グローバルスキルが更新されました'
    });
  } catch (error) {
    next(error);
  }
});

// Delete global skill
router.delete('/global/:id', authenticate, authorize(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.globalSkill.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: 'グローバルスキルが削除されました'
    });
  } catch (error) {
    next(error);
  }
});

// Get company's selected skills
router.get('/company', authenticate, async (req, res, next) => {
  try {
    let companyId;
    
    if (req.user.role === 'ADMIN') {
      companyId = req.query.companyId ? parseInt(req.query.companyId) : null;
      if (!companyId) {
        throw new AppError('companyIdが必要です', 400);
      }
    } else if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else {
      companyId = req.user.companyId;
    }

    const companySkills = await prisma.skill.findMany({
      where: { companyId },
      include: {
        globalSkill: true,
        userSkills: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { globalSkill: { category: 'asc' } },
        { globalSkill: { name: 'asc' } }
      ]
    });

    res.json({
      status: 'success',
      data: { skills: companySkills }
    });
  } catch (error) {
    next(error);
  }
});

// Add skills to company from global skills
router.post('/company/add-from-global', authenticate, authorize(['ADMIN', 'COMPANY']), [
  body('globalSkillIds').isArray().notEmpty().withMessage('グローバルスキルIDの配列が必要です')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const { globalSkillIds } = req.body;
    let companyId;

    if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else {
      companyId = req.body.companyId;
      if (!companyId) {
        throw new AppError('companyIdが必要です', 400);
      }
    }

    const skillsToCreate = globalSkillIds.map(globalSkillId => ({
      companyId: parseInt(companyId),
      globalSkillId: parseInt(globalSkillId)
    }));

    await prisma.skill.createMany({
      data: skillsToCreate,
      skipDuplicates: true
    });

    res.json({
      status: 'success',
      message: 'スキルが会社に追加されました'
    });
  } catch (error) {
    next(error);
  }
});

// Remove skill from company
router.delete('/company/:id', authenticate, authorize(['ADMIN', 'COMPANY']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(id) }
    });

    if (!skill) {
      throw new AppError('スキルが見つかりません', 404);
    }

    // Permission check for COMPANY role
    if (req.user.role === 'COMPANY' && skill.companyId !== req.user.managedCompanyId) {
      throw new AppError('権限がありません', 403);
    }

    await prisma.skill.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: 'スキルが会社から削除されました'
    });
  } catch (error) {
    next(error);
  }
});

// Get user's skills
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Permission check
    if (req.user.role === 'USER' && req.user.id !== parseInt(userId)) {
      throw new AppError('権限がありません', 403);
    }

    const userSkills = await prisma.userSkill.findMany({
      where: { userId: parseInt(userId) },
      include: {
        skill: {
          include: {
            globalSkill: true
          }
        }
      },
      orderBy: [
        { skill: { globalSkill: { category: 'asc' } } },
        { skill: { globalSkill: { name: 'asc' } } }
      ]
    });

    res.json({
      status: 'success',
      data: { userSkills }
    });
  } catch (error) {
    next(error);
  }
});

// Add/Update user skill
router.post('/user', authenticate, [
  body('userId').isInt().withMessage('有効なユーザーIDが必要です'),
  body('skillId').isInt().withMessage('有効なスキルIDが必要です'),
  body('level').isInt({ min: 1, max: 5 }).withMessage('レベルは1-5の整数である必要があります'),
  body('experienceYears').optional().isInt({ min: 0 }).withMessage('経験年数は0以上の整数である必要があります')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const { userId, skillId, level, experienceYears } = req.body;

    // Permission check
    if (req.user.role === 'USER' && req.user.id !== parseInt(userId)) {
      throw new AppError('権限がありません', 403);
    }

    const userSkill = await prisma.userSkill.upsert({
      where: {
        userId_skillId: {
          userId: parseInt(userId),
          skillId: parseInt(skillId)
        }
      },
      update: {
        level: parseInt(level),
        experienceYears: experienceYears ? parseInt(experienceYears) : null
      },
      create: {
        userId: parseInt(userId),
        skillId: parseInt(skillId),
        level: parseInt(level),
        experienceYears: experienceYears ? parseInt(experienceYears) : null
      },
      include: {
        skill: {
          include: {
            globalSkill: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { userSkill },
      message: 'ユーザースキルが更新されました'
    });
  } catch (error) {
    next(error);
  }
});

// Delete user skill
router.delete('/user/:userId/:skillId', authenticate, async (req, res, next) => {
  try {
    const { userId, skillId } = req.params;

    // Permission check
    if (req.user.role === 'USER' && req.user.id !== parseInt(userId)) {
      throw new AppError('権限がありません', 403);
    }

    await prisma.userSkill.delete({
      where: {
        userId_skillId: {
          userId: parseInt(userId),
          skillId: parseInt(skillId)
        }
      }
    });

    res.json({
      status: 'success',
      message: 'ユーザースキルが削除されました'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
