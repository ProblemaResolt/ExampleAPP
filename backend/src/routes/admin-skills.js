const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 管理者専用：スキル重複分析とグローバルスキル統合機能

// スキル重複分析エンドポイント
router.get('/skill-duplicates', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    // 重複している可能性のあるスキル名を分析
    const skillDuplicates = await prisma.$queryRaw`
      SELECT 
        LOWER(TRIM(name)) as normalized_name,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT company_id) as company_ids,
        ARRAY_AGG(name) as variations
      FROM "Skill" 
      WHERE "isDeprecated" = false
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `;

    // 詳細情報を取得
    const duplicateDetails = await Promise.all(
      skillDuplicates.map(async (duplicate) => {
        const skills = await prisma.skill.findMany({
          where: {
            name: {
              in: duplicate.variations,
              mode: 'insensitive'
            },
            isDeprecated: false
          },
          include: {
            company: { select: { id: true, name: true } },
            _count: { select: { userSkills: true } }
          }
        });

        return {
          normalizedName: duplicate.normalized_name,
          totalCount: duplicate.count,
          variations: duplicate.variations,
          skills: skills.map(skill => ({
            id: skill.id,
            name: skill.name,
            company: skill.company,
            userCount: skill._count.userSkills
          }))
        };
      })
    );

    res.json({
      status: 'success',
      data: {
        duplicateCount: skillDuplicates.length,
        duplicates: duplicateDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// グローバルスキル統合提案エンドポイント
router.post('/suggest-global-skills', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { threshold = 2 } = req.body; // 最低何社で使用されていればグローバル化するか

    // 複数の会社で使用されているスキルを特定
    const popularSkills = await prisma.$queryRaw`
      SELECT 
        LOWER(TRIM(name)) as normalized_name,
        COUNT(DISTINCT company_id) as company_count,
        SUM(user_skill_count) as total_users,
        ARRAY_AGG(DISTINCT name) as name_variations,
        ARRAY_AGG(DISTINCT company_id) as company_ids
      FROM (
        SELECT 
          s.name,
          s.company_id,
          COUNT(us.id) as user_skill_count
        FROM "Skill" s
        LEFT JOIN "UserSkill" us ON s.id = us.skill_id
        WHERE s."isDeprecated" = false
        GROUP BY s.id, s.name, s.company_id
      ) skill_stats
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(DISTINCT company_id) >= ${threshold}
      ORDER BY COUNT(DISTINCT company_id) DESC, SUM(user_skill_count) DESC
    `;

    // カテゴリ分類の提案
    const categoryMap = {
      'javascript': 'プログラミング言語',
      'typescript': 'プログラミング言語',
      'python': 'プログラミング言語',
      'java': 'プログラミング言語',
      'react': 'フロントエンド',
      'vue': 'フロントエンド',
      'angular': 'フロントエンド',
      'node': 'バックエンド',
      'express': 'バックエンド',
      'docker': 'インフラ',
      'aws': 'クラウド',
      'azure': 'クラウド',
      'gcp': 'クラウド',
      'mysql': 'データベース',
      'postgresql': 'データベース',
      'mongodb': 'データベース',
      'git': 'ツール',
      'figma': 'デザイン',
      'photoshop': 'デザイン'
    };

    const suggestions = popularSkills.map(skill => ({
      normalizedName: skill.normalized_name,
      suggestedGlobalName: skill.name_variations[0], // 最初のバリエーションを代表名として提案
      category: categoryMap[skill.normalized_name] || 'その他',
      companyCount: skill.company_count,
      totalUsers: skill.total_users,
      nameVariations: skill.name_variations,
      companyIds: skill.company_ids
    }));

    res.json({
      status: 'success',
      data: {
        threshold,
        suggestionsCount: suggestions.length,
        suggestions
      }
    });
  } catch (error) {
    next(error);
  }
});

// スキルのグローバル化実行エンドポイント
router.post('/migrate-to-global', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { skillName, category, description, affectedSkillIds } = req.body;

    if (!skillName || !affectedSkillIds || !Array.isArray(affectedSkillIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'skillName and affectedSkillIds are required'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. グローバルスキルを作成または取得
      let globalSkill;
      try {
        globalSkill = await tx.globalSkill.create({
          data: {
            name: skillName,
            category: category || 'その他',
            description
          }
        });
      } catch (error) {
        if (error.code === 'P2002') {
          // 既に存在する場合は取得
          globalSkill = await tx.globalSkill.findUnique({
            where: { name: skillName }
          });
        } else {
          throw error;
        }
      }

      // 2. 各スキルに関連する会社を特定し、CompanySelectedSkillを作成
      const affectedSkills = await tx.skill.findMany({
        where: { id: { in: affectedSkillIds } },
        include: {
          company: true,
          userSkills: true
        }
      });

      const companyMigrations = [];
      const userSkillMigrations = [];

      for (const skill of affectedSkills) {
        // CompanySelectedSkillを作成（既に存在しない場合）
        let companySelectedSkill;
        try {
          companySelectedSkill = await tx.companySelectedSkill.create({
            data: {
              companyId: skill.companyId,
              globalSkillId: globalSkill.id,
              isRequired: false // デフォルトは任意
            }
          });
        } catch (error) {
          if (error.code === 'P2002') {
            // 既に存在する場合は取得
            companySelectedSkill = await tx.companySelectedSkill.findUnique({
              where: {
                companyId_globalSkillId: {
                  companyId: skill.companyId,
                  globalSkillId: globalSkill.id
                }
              }
            });
          } else {
            throw error;
          }
        }

        companyMigrations.push({
          skillId: skill.id,
          companyId: skill.companyId,
          companySelectedSkillId: companySelectedSkill.id
        });

        // ユーザースキルの移行
        for (const userSkill of skill.userSkills) {
          userSkillMigrations.push({
            userSkillId: userSkill.id,
            userId: userSkill.userId,
            companySelectedSkillId: companySelectedSkill.id,
            years: userSkill.years
          });
        }
      }

      // 3. UserSkillレコードを新しい構造に移行
      for (const migration of userSkillMigrations) {
        await tx.userSkill.update({
          where: { id: migration.userSkillId },
          data: {
            companySelectedSkillId: migration.companySelectedSkillId,
            skillId: null // レガシーフィールドをクリア
          }
        });
      }

      // 4. 古いSkillレコードを非推奨としてマーク
      await tx.skill.updateMany({
        where: { id: { in: affectedSkillIds } },
        data: { isDeprecated: true }
      });

      return {
        globalSkill,
        migratedCompanies: companyMigrations.length,
        migratedUserSkills: userSkillMigrations.length,
        deprecatedSkills: affectedSkillIds.length
      };
    });

    res.json({
      status: 'success',
      message: 'Skills successfully migrated to global skill system',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// 会社独自スキル追加機能
router.post('/add-company-custom-skill', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { companyId, skillName, category, description, isRequired = false } = req.body;

    // 権限チェック
    let targetCompanyId = companyId;
    if (req.user.role === 'COMPANY') {
      targetCompanyId = req.user.managedCompanyId;
    }

    if (!targetCompanyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Company ID is required'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. グローバルスキルとして追加（会社固有でも検索可能にするため）
      let globalSkill;
      try {
        globalSkill = await tx.globalSkill.create({
          data: {
            name: `${skillName} (${await tx.company.findUnique({ where: { id: targetCompanyId }, select: { name: true } }).then(c => c.name)}専用)`,
            category: category || 'その他',
            description: description || `${skillName} - 会社独自スキル`
          }
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new Error('同名のスキルが既に存在します');
        }
        throw error;
      }

      // 2. CompanySelectedSkillとして登録
      const companySelectedSkill = await tx.companySelectedSkill.create({
        data: {
          companyId: targetCompanyId,
          globalSkillId: globalSkill.id,
          isRequired
        }
      });

      return { globalSkill, companySelectedSkill };
    });

    res.json({
      status: 'success',
      message: 'Company custom skill added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// スキル統計情報
router.get('/skill-stats', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [
      totalGlobalSkills,
      totalLegacySkills,
      activeLegacySkills,
      totalCompanySelections,
      totalUserSkills
    ] = await Promise.all([
      prisma.globalSkill.count(),
      prisma.skill.count(),
      prisma.skill.count({ where: { isDeprecated: false } }),
      prisma.companySelectedSkill.count(),
      prisma.userSkill.count()
    ]);

    const migrationProgress = totalLegacySkills > 0 
      ? ((totalLegacySkills - activeLegacySkills) / totalLegacySkills * 100).toFixed(1)
      : 100;

    res.json({
      status: 'success',
      data: {
        globalSkills: totalGlobalSkills,
        legacySkills: {
          total: totalLegacySkills,
          active: activeLegacySkills,
          deprecated: totalLegacySkills - activeLegacySkills
        },
        companySelections: totalCompanySelections,
        userSkills: totalUserSkills,
        migrationProgress: `${migrationProgress}%`
      }
    });
  } catch (error) {
    next(error);
  }
});

// DB容量効率化統計エンドポイント
router.get('/efficiency-stats', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    // レガシーシステムの統計
    const legacyStats = await prisma.skill.aggregate({
      where: { isDeprecated: false },
      _count: { id: true }
    });

    const legacySkillsWithUsers = await prisma.skill.findMany({
      where: { isDeprecated: false },
      include: {
        _count: { select: { userSkills: true } },
        company: { select: { name: true } }
      }
    });

    // 新システムの統計
    const globalSkillsCount = await prisma.globalSkill.count();
    const companySelectedSkillsCount = await prisma.companySelectedSkill.count();
    const totalUserSkillsOnNewSystem = await prisma.userSkill.count({
      where: { companySelectedSkillId: { not: null } }
    });

    // 重複分析
    const duplicateAnalysis = await prisma.$queryRaw`
      SELECT 
        LOWER(TRIM(name)) as normalized_name,
        COUNT(*) as duplicate_count,
        COUNT(DISTINCT company_id) as companies_using,
        SUM(user_skill_count) as total_users
      FROM (
        SELECT 
          s.name,
          s.company_id,
          COUNT(us.id) as user_skill_count
        FROM "Skill" s
        LEFT JOIN "UserSkill" us ON s.id = us.skill_id
        WHERE s."isDeprecated" = false
        GROUP BY s.id, s.name, s.company_id
      ) skill_stats
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
    `;

    // 容量効率化の計算
    const totalLegacyRecords = legacyStats._count.id;
    const estimatedOptimizedRecords = globalSkillsCount + companySelectedSkillsCount;
    const efficiencyGain = totalLegacyRecords > 0 
      ? ((totalLegacyRecords - estimatedOptimizedRecords) / totalLegacyRecords * 100).toFixed(2)
      : 0;

    // 重複によるストレージ浪費の計算
    const duplicateWaste = duplicateAnalysis.reduce((total, dup) => {
      return total + (Number(dup.duplicate_count) - 1); // 1つを残して他は無駄
    }, 0);

    res.json({
      status: 'success',
      data: {
        legacy: {
          totalSkills: totalLegacyRecords,
          skillsWithUsers: legacySkillsWithUsers.length,
          averageUsersPerSkill: legacySkillsWithUsers.length > 0 
            ? (legacySkillsWithUsers.reduce((sum, s) => sum + s._count.userSkills, 0) / legacySkillsWithUsers.length).toFixed(2)
            : 0
        },
        newSystem: {
          globalSkills: globalSkillsCount,
          companySelections: companySelectedSkillsCount,
          userSkillMappings: totalUserSkillsOnNewSystem
        },
        efficiency: {
          beforeOptimization: totalLegacyRecords,
          afterOptimization: estimatedOptimizedRecords,
          recordsReduced: totalLegacyRecords - estimatedOptimizedRecords,
          efficiencyGainPercent: parseFloat(efficiencyGain),
          duplicateWasteRecords: duplicateWaste
        },
        duplicateAnalysis: duplicateAnalysis.map(dup => ({
          skillName: dup.normalized_name,
          duplicateCount: Number(dup.duplicate_count),
          companiesUsing: Number(dup.companies_using),
          totalUsers: Number(dup.total_users)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
