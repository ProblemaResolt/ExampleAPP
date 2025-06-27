/**
 * スキル経験年数を定期的に更新するバッチ処理スクリプト
 * 
 * このスクリプトは以下の場合に使用できます：
 * 1. 大量のデータを一括で更新する必要がある場合
 * 2. パフォーマンスを向上させるため事前計算値を保存したい場合
 * 3. 既存データの整合性を確保したい場合
 * 
 * 使用方法:
 * node scripts/updateSkillYears.js
 */

const { PrismaClient } = require('@prisma/client');
const { calculateSkillYears } = require('../src/utils/skillCalculations');

const prisma = new PrismaClient();

async function updateAllSkillYears() {
  console.log('スキル経験年数の一括更新を開始します...');
  
  try {
    // 全てのユーザースキルを取得
    const userSkills = await prisma.userSkill.findMany({
      where: {
        createdAt: { not: null } // createdAtがnullでないもののみ
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        companySelectedSkill: {
          select: { 
            skillName: true,
            globalSkill: { select: { name: true } }
          }
        }
      }
    });

    console.log(`${userSkills.length}件のユーザースキルを処理します...`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const userSkill of userSkills) {
      const calculatedYears = calculateSkillYears(userSkill.createdAt);
      
      // 手動で設定された年数がない場合（nullまたはundefined）のみ更新
      if (userSkill.years === null || userSkill.years === undefined) {
        await prisma.userSkill.update({
          where: { id: userSkill.id },
          data: { 
            years: calculatedYears,
            updatedAt: new Date()
          }
        });
        
        updatedCount++;
        
        const skillName = userSkill.companySelectedSkill?.skillName || 
                         userSkill.companySelectedSkill?.globalSkill?.name || 
                         'Unknown Skill';
        
        console.log(`✅ 更新: ${userSkill.user.firstName} ${userSkill.user.lastName} - ${skillName}: ${calculatedYears}年`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n✨ 一括更新完了！');
    console.log(`📊 統計:
    - 処理対象: ${userSkills.length}件
    - 更新: ${updatedCount}件
    - スキップ（手動設定済み）: ${skippedCount}件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateSkillYears() {
  console.log('スキル経験年数の検証を開始します...');
  
  try {
    const userSkills = await prisma.userSkill.findMany({
      where: {
        createdAt: { not: null },
        years: { not: null }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        },
        companySelectedSkill: {
          select: { 
            skillName: true,
            globalSkill: { select: { name: true } }
          }
        }
      }
    });

    console.log(`${userSkills.length}件のユーザースキルを検証します...`);

    let inconsistentCount = 0;

    for (const userSkill of userSkills) {
      const calculatedYears = calculateSkillYears(userSkill.createdAt);
      const storedYears = userSkill.years;
      
      if (calculatedYears !== storedYears) {
        inconsistentCount++;
        
        const skillName = userSkill.companySelectedSkill?.skillName || 
                         userSkill.companySelectedSkill?.globalSkill?.name || 
                         'Unknown Skill';
        
        console.log(`⚠️  不整合: ${userSkill.user.firstName} ${userSkill.user.lastName} - ${skillName}`);
        console.log(`   保存値: ${storedYears}年, 計算値: ${calculatedYears}年`);
      }
    }

    if (inconsistentCount === 0) {
      console.log('✅ 全てのスキル経験年数が正しく設定されています');
    } else {
      console.log(`⚠️  ${inconsistentCount}件の不整合が見つかりました`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数による処理の分岐
const command = process.argv[2];

switch (command) {
  case 'update':
    updateAllSkillYears();
    break;
  case 'validate':
    validateSkillYears();
    break;
  default:
    console.log(`使用方法:
  node scripts/updateSkillYears.js update   - 全スキルの経験年数を更新
  node scripts/updateSkillYears.js validate - スキル経験年数の整合性を検証`);
    process.exit(1);
}
