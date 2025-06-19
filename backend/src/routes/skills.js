const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/authentication');
const { validationResult, body } = require('express-validator');
const { AppError } = require('../middleware/error');

const router = express.Router();
const prisma = new PrismaClient();

// Get all global skills with categories
router.get('/global', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
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
router.post('/global', authenticate, authorize('ADMIN'), [
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
router.put('/global/:id', authenticate, authorize('ADMIN'), [
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
router.delete('/global/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
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
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else {
      companyId = req.user.companyId;
    }

    // 会社が選択したグローバルスキルを取得 
    const companySkills = await prisma.companySelectedSkill.findMany({
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

    // 独自スキルの場合にskillNameをnameとして追加
    const processedSkills = companySkills.map(skill => {
      if (skill.isCustom && skill.skillName) {
        // 独自スキルの場合
        return {
          ...skill,
          name: skill.skillName,
          category: skill.category || 'その他',
          description: skill.description || ''
        };
      }
      // 通常のグローバルスキルの場合
      return skill;
    });

    res.json({
      status: 'success',
      data: { skills: processedSkills }
    });
  } catch (error) {
    next(error);
  }
});

// Add global skill to company (単一選択)
router.post('/company/select', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), [
  body('globalSkillId').isString().notEmpty().withMessage('グローバルスキルIDが必要です'),
  body('isRequired').optional().isBoolean().withMessage('必須フラグは真偽値である必要があります')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('バリデーションエラー', 400, errors.array());
    }

    const { globalSkillId, isRequired = false } = req.body;
    let companyId;

    // 会社ID決定ロジック
    if (req.user.role === 'ADMIN') {
      companyId = req.user.companyId || req.body.companyId;
      if (!companyId) {
        throw new AppError('管理者の場合はcompanyIdが必要です', 400);
      }
    } else if (req.user.role === 'COMPANY') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else {
      throw new AppError('権限がありません', 403);
    }

    // CompanySelectedSkillとして追加（重複チェック付き）
    const companySelectedSkill = await prisma.companySelectedSkill.upsert({
      where: {
        companyId_globalSkillId: {
          companyId: companyId,        // CUIDなので文字列のまま
          globalSkillId: globalSkillId // CUIDなので文字列のまま
        }
      },
      update: {
        isRequired: Boolean(isRequired)
      },
      create: {
        companyId: companyId,        // CUIDなので文字列のまま
        globalSkillId: globalSkillId, // CUIDなので文字列のまま
        isRequired: Boolean(isRequired)
      },
      include: {
        globalSkill: true
      }
    });

    res.json({
      status: 'success',
      data: { skill: companySelectedSkill },
      message: 'スキルが会社に追加されました'
    });
  } catch (error) {
    next(error);
  }
});

// Add skills to company from global skills (旧API - 後方互換性)
router.post('/company/add-from-global', authenticate, authorize(['ADMIN', 'COMPANY', 'MANAGER']), [
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
    } else if (req.user.role === 'MANAGER') {
      companyId = req.user.companyId;
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
router.delete('/company/:id', authenticate, authorize(['ADMIN', 'COMPANY', 'MANAGER']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // 新しいスキルシステム: CompanySelectedSkillから削除
    const companySelectedSkill = await prisma.companySelectedSkill.findUnique({
      where: { id: id },
      include: {
        globalSkill: true
      }
    });

    if (!companySelectedSkill) {
      throw new AppError('スキルが見つかりません', 404);
    }

    // Permission check for COMPANY and MANAGER roles
    let userCompanyId;
    if (req.user.role === 'COMPANY') {
      userCompanyId = req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      userCompanyId = req.user.companyId;
    }

    if (userCompanyId && companySelectedSkill.companyId !== userCompanyId) {
      throw new AppError('権限がありません', 403);
    }

    // 関連するユーザースキルも削除
    await prisma.userSkill.deleteMany({
      where: { 
        companySelectedSkillId: id
      }
    });

    // CompanySelectedSkillを削除
    await prisma.companySelectedSkill.delete({
      where: { id: id }
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

// Get available global skills for company selection
router.get('/company/available', authenticate, authorize('ADMIN', 'COMPANY', 'MANAGER'), async (req, res, next) => {
  try {
    const { category, search } = req.query;
    
    // Determine company ID based on user role
    let companyId;
    if (req.user.role === 'ADMIN') {
      // Admin can query any company, try multiple sources
      companyId = req.user.companyId || req.user.managedCompanyId || (await prisma.company.findFirst())?.id;
    } else if (req.user.role === 'COMPANY') {
      // COMPANY users: try both companyId and managedCompanyId
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else {
      companyId = req.user.companyId;
    }

    if (!companyId) {
      return res.json({
        status: 'success',
        data: { skills: [], categories: {} },
        message: '会社が設定されていません',
        debugInfo: {
          userId: req.user.id,
          role: req.user.role,
          companyId: req.user.companyId,
          managedCompanyId: req.user.managedCompanyId,
          recommendation: 'JWT token refresh required - please logout and login again'
        }
      });
    }

    // Get already selected global skills for this company
    // Check new CompanySelectedSkill table (legacy Skill table doesn't have globalSkillId)
    const companySelectedSkills = await prisma.companySelectedSkill.findMany({
      where: { companyId },
      select: { globalSkillId: true }
    });
    
    const selectedIds = companySelectedSkills.map(s => s.globalSkillId).filter(id => id);

    // Build where clause for filtering
    const where = {
      id: { notIn: selectedIds } // Exclude already selected skills
    };
    
    if (category) where.category = category;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const availableSkills = await prisma.globalSkill.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group by category
    const categories = {};
    availableSkills.forEach(skill => {
      const cat = skill.category || 'Other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(skill);
    });

    res.json({
      status: 'success',
      data: {
        skills: availableSkills,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create company custom skill (会社独自スキル - 他社からは見えない)
router.post('/company/custom', authenticate, authorize(['ADMIN', 'COMPANY', 'MANAGER']), [
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
    let companyId;

    // 会社ID決定ロジック
    if (req.user.role === 'ADMIN') {
      companyId = req.user.companyId || req.body.companyId;
      if (!companyId) {
        throw new AppError('管理者の場合はcompanyIdが必要です', 400);
      }
    } else if (req.user.role === 'COMPANY') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else if (req.user.role === 'MANAGER') {
      companyId = req.user.companyId || req.user.managedCompanyId;
    } else {
      throw new AppError('権限がありません', 403);
    }
    
    if (!companyId) {
      throw new AppError('会社IDが取得できません', 400);
    }

    // 会社を取得
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true }
    });

    if (!company) {
      throw new AppError('会社が見つかりません', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // セキュリティ修正: 会社独自スキルはGlobalSkillに追加せず
      // CompanySelectedSkillのみに直接追加（他社からは見えない）
      
      // 重複チェック
      const existingSkill = await tx.companySelectedSkill.findFirst({
        where: {
          companyId: companyId,
          OR: [
            { globalSkill: { name: name } },
            { skillName: name }
          ]
        }
      });
      
      if (existingSkill) {
        throw new AppError('同名のスキルが既に存在します', 400);
      }

      // 会社専用スキルとして直接追加（GlobalSkillテーブルは使用しない）
      const companySelectedSkill = await tx.companySelectedSkill.create({
        data: {
          companyId: companyId,
          // globalSkillId は null
          skillName: name,
          category: category,
          description: description || `${name} - ${company.name}の独自スキル`,
          isRequired: false,
          isCustom: true // カスタムスキルフラグ
        }
      });

      return { companySelectedSkill };
    });

    res.json({
      status: 'success',
      data: { skill: result.companySelectedSkill },
      message: '独自スキルが作成されました（セキュア：自社のみ表示）'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
