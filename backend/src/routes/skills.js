const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { validationResult, body } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();
const prisma = new PrismaClient();

// Global skills management (Admin only)

// Get all global skills with categories
router.get('/global', authenticate, authorize('ADMIN'), async (req, res, next) => {
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

// Create global skill (Admin only)
router.post('/global', 
  authenticate, 
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Skill name is required'),
    body('category').optional().isString(),
    body('description').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { name, category, description } = req.body;

      const globalSkill = await prisma.globalSkill.create({
        data: {
          name: name.trim(),
          category: category || 'Other',
          description
        }
      });

      res.status(201).json({
        status: 'success',
        data: { skill: globalSkill }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          status: 'error',
          message: 'A skill with this name already exists'
        });
      }
      next(error);
    }
  }
);

// Company skill management

// Get company's selected skills
router.get('/company', authenticate, async (req, res, next) => {
  try {
    let companyId;
    
    if (req.user.role === 'ADMIN') {
      companyId = req.query.companyId;
      if (!companyId) {
        return res.status(400).json({
          status: 'error',
          message: 'Company ID is required for admin users'
        });
      }
    } else if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else {
      companyId = req.user.companyId;
    }

    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Company information not found'
      });
    }

    const companySkills = await prisma.companySelectedSkill.findMany({
      where: { companyId },
      include: {
        globalSkill: true,
        _count: {
          select: { userSkills: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { globalSkill: { category: 'asc' } },
        { globalSkill: { name: 'asc' } }
      ]
    });

    // Transform for compatibility with existing frontend
    const skills = companySkills.map(cs => ({
      id: cs.id,
      name: cs.globalSkill.name,
      category: cs.globalSkill.category,
      description: cs.globalSkill.description,
      isRequired: cs.isRequired,
      priority: cs.priority,
      globalSkillId: cs.globalSkillId,
      _count: {
        userSkills: cs._count.userSkills
      }
    }));

    res.json({
      status: 'success',
      data: { skills }
    });
  } catch (error) {
    next(error);
  }
});

// Add skill to company selection
router.post('/company/select',
  authenticate,
  authorize('ADMIN', 'COMPANY', 'MANAGER', 'MEMBER'),
  [
    body('globalSkillId').notEmpty().withMessage('Global skill ID is required'),
    body('isRequired').optional().isBoolean(),
    body('priority').optional().custom((value) => {
      if (value === null || value === undefined) return true;
      return Number.isInteger(value);
    }).withMessage('Priority must be an integer or null')  ],
  async (req, res, next) => {
    try {
      console.log('🔍 Skill selection request:', {
        user: {
          id: req.user.id,
          role: req.user.role,
          companyId: req.user.companyId,
          managedCompanyId: req.user.managedCompanyId
        },
        body: req.body
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors in skill selection:', errors.array());
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { globalSkillId, isRequired = false, priority } = req.body;
      
      let companyId;
      if (req.user.role === 'COMPANY') {
        companyId = req.user.managedCompanyId;
      } else if (req.user.role === 'ADMIN') {
        companyId = req.body.companyId || req.query.companyId;
      } else if (req.user.role === 'MANAGER' || req.user.role === 'MEMBER') {
        companyId = req.user.companyId;
      }

      if (!companyId) {
        return res.status(400).json({
          status: 'error',
          message: 'Company information not found'
        });
      }

      // Verify global skill exists
      const globalSkill = await prisma.globalSkill.findUnique({
        where: { id: globalSkillId }
      });

      if (!globalSkill) {
        return res.status(404).json({
          status: 'error',
          message: 'Global skill not found'
        });
      }

      const companySelectedSkill = await prisma.companySelectedSkill.create({
        data: {
          companyId,
          globalSkillId,
          isRequired,
          priority
        },
        include: {
          globalSkill: true
        }
      });

      res.status(201).json({
        status: 'success',
        data: { skill: companySelectedSkill }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          status: 'error',
          message: 'This skill is already selected for the company'
        });
      }
      next(error);
    }
  }
);

// Remove skill from company selection
router.delete('/company/:skillId', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { skillId } = req.params;
    
    // Find the skill and verify permissions
    const companySkill = await prisma.companySelectedSkill.findUnique({
      where: { id: skillId },
      include: { company: true }
    });

    if (!companySkill) {
      return res.status(404).json({
        status: 'error',
        message: 'Company skill not found'
      });
    }

    // Permission check
    let hasAccess = false;
    if (req.user.role === 'ADMIN') {
      hasAccess = true;
    } else if (req.user.role === 'COMPANY' && req.user.managedCompanyId === companySkill.companyId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if skill is being used by any users
    const userCount = await prisma.userSkill.count({
      where: { companySelectedSkillId: skillId }
    });

    if (userCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `使用しているユーザーが ${userCount} 人います。`
      });
    }

    await prisma.companySelectedSkill.delete({
      where: { id: skillId }
    });

    res.json({
      status: 'success',
      message: 'Skill removed from company selection'
    });
  } catch (error) {
    next(error);
  }
});

// Get available global skills for company selection
router.get('/company/available', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    let companyId;
    if (req.user.role === 'COMPANY') {
      companyId = req.user.managedCompanyId;
    } else if (req.user.role === 'ADMIN') {
      companyId = req.query.companyId;
    }

    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Company information not found'
      });
    }

    // Get already selected skills
    const selectedSkills = await prisma.companySelectedSkill.findMany({
      where: { companyId },
      select: { globalSkillId: true }
    });

    const selectedSkillIds = selectedSkills.map(s => s.globalSkillId);

    // Get available skills (not yet selected)
    const availableSkills = await prisma.globalSkill.findMany({
      where: {
        id: { notIn: selectedSkillIds }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      status: 'success',
      data: { skills: availableSkills }
    });
  } catch (error) {
    next(error);
  }
});

// User skill management

// Get user's skills
router.get('/user/:userId?', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Permission check
    if (userId !== req.user.id && !['ADMIN', 'COMPANY', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        companySelectedSkill: {
          include: {
            globalSkill: true
          }
        }
      },
      orderBy: {
        companySelectedSkill: {
          globalSkill: { name: 'asc' }
        }
      }
    });

    // Transform for compatibility
    const skills = userSkills.map(us => ({
      id: us.companySelectedSkill.globalSkill.id,
      name: us.companySelectedSkill.globalSkill.name,
      category: us.companySelectedSkill.globalSkill.category,
      years: us.years,
      level: us.level,
      certifications: us.certifications ? JSON.parse(us.certifications) : null,
      lastUsed: us.lastUsed
    }));

    res.json({
      status: 'success',
      data: { skills }
    });
  } catch (error) {
    next(error);
  }
});

// Add/Update user skill
router.post('/user/:userId/skills',
  authenticate,
  [
    body('companySelectedSkillId').notEmpty().withMessage('Company selected skill ID is required'),
    body('years').optional().isInt({ min: 0 }),
    body('level').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }

      const { userId } = req.params;
      const { companySelectedSkillId, years, level, certifications } = req.body;
      
      // Permission check
      if (userId !== req.user.id && !['ADMIN', 'COMPANY', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }

      // Verify company selected skill exists and belongs to user's company
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      const companySkill = await prisma.companySelectedSkill.findUnique({
        where: { id: companySelectedSkillId },
        include: { globalSkill: true }
      });

      if (!companySkill || companySkill.companyId !== user.companyId) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid skill selection for this company'
        });
      }

      const userSkill = await prisma.userSkill.upsert({
        where: {
          userId_companySelectedSkillId: {
            userId,
            companySelectedSkillId
          }
        },
        update: {
          years,
          level,
          certifications: certifications ? JSON.stringify(certifications) : null,
          lastUsed: new Date()
        },
        create: {
          userId,
          companySelectedSkillId,
          years,
          level,
          certifications: certifications ? JSON.stringify(certifications) : null,
          lastUsed: new Date()
        },
        include: {
          companySelectedSkill: {
            include: { globalSkill: true }
          }
        }
      });

      res.json({
        status: 'success',
        data: { userSkill }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete user skill
router.delete('/user/:userId/skills/:skillId', authenticate, async (req, res, next) => {
  try {
    const { userId, skillId } = req.params;
    
    // Permission check
    if (userId !== req.user.id && !['ADMIN', 'COMPANY', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await prisma.userSkill.delete({
      where: {
        userId_companySelectedSkillId: {
          userId,
          companySelectedSkillId: skillId
        }
      }
    });

    res.json({
      status: 'success',
      message: 'User skill removed'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'User skill not found'
      });
    }
    next(error);
  }
});

// Company custom skills management

// Create custom skill for company
router.post('/company/custom', 
  authenticate, 
  authorize('ADMIN', 'COMPANY', 'MANAGER', 'MEMBER'),
  [
    body('name').trim().isLength({ min: 1 }).withMessage('スキル名は必須です'),
    body('category').optional().trim(),
    body('description').optional().trim()  ],
  async (req, res, next) => {
    try {
      console.log('🔍 Custom skill creation request:', {
        user: {
          id: req.user.id,
          role: req.user.role,
          companyId: req.user.companyId,
          managedCompanyId: req.user.managedCompanyId
        },
        body: req.body
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          status: 'error',
          message: 'バリデーションエラー',
          errors: errors.array()
        });
      }

      const { name, category, description } = req.body;
      
      // Get company ID based on user role
      let companyId;
      if (req.user.role === 'ADMIN') {
        companyId = req.body.companyId;
        if (!companyId) {
          return res.status(400).json({
            status: 'error',
            message: '管理者の場合はcompanyIdが必要です'
          });
        }
      } else if (req.user.role === 'COMPANY') {
        companyId = req.user.managedCompanyId;
      } else {
        companyId = req.user.companyId;
      }

      if (!companyId) {
        return res.status(400).json({
          status: 'error',
          message: '会社情報が見つかりません'
        });
      }

      // Check if skill name already exists globally
      const existingGlobalSkill = await prisma.globalSkill.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' }
        }
      });

      if (existingGlobalSkill) {
        return res.status(400).json({
          status: 'error',
          message: `「${name}」は既にグローバルスキルとして存在します。利用可能スキルから選択してください。`
        });
      }

      // Check if custom skill already exists for this company
      const existingCustomSkill = await prisma.companySelectedSkill.findFirst({
        where: {
          companyId,
          globalSkill: {
            name: { equals: name.trim(), mode: 'insensitive' }
          }
        }
      });

      if (existingCustomSkill) {
        return res.status(400).json({
          status: 'error',
          message: `「${name}」は既にこの会社のスキルとして存在します`
        });
      }      console.log('🔄 Creating custom skill:', { name, category, description, companyId });

      // Create new global skill first
      const globalSkill = await prisma.globalSkill.create({
        data: {
          name: name.trim(),
          category: category?.trim() || 'カスタム',
          description: description?.trim(),
          isCustom: true
        }
      });

      console.log('✅ Global skill created:', globalSkill);

      // Then create company selection for this skill
      const companySelectedSkill = await prisma.companySelectedSkill.create({
        data: {
          companyId,
          globalSkillId: globalSkill.id,
          isRequired: false,
          priority: null
        },
        include: {
          globalSkill: true,
          company: {
            select: { id: true, name: true }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data: { 
          skill: {
            id: companySelectedSkill.id,
            name: globalSkill.name,
            category: globalSkill.category,
            description: globalSkill.description,
            isCustom: true,
            isRequired: companySelectedSkill.isRequired,
            companyId: companySelectedSkill.companyId,
            company: companySelectedSkill.company,
            _count: { userSkills: 0 }
          }
        },
        message: `独自スキル「${globalSkill.name}」を作成しました`
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
