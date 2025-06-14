const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGlobalSkills() {
  try {
    // グローバルスキルの総数を確認
    const totalGlobalSkills = await prisma.globalSkill.count();
    
    // 最初の10件のグローバルスキルを取得
    const globalSkills = await prisma.globalSkill.findMany({
      take: 10,
      orderBy: { id: 'asc' }
    });
    
    // 各カテゴリ別の数を確認
    const skillsByCategory = await prisma.globalSkill.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });
    
    // 会社が選択済みのスキル数を確認
    const selectedSkillsCount = await prisma.skill.count();
    
    // 特定の会社（ID: 1）が選択済みのスキルを確認
    const companySelectedSkills = await prisma.skill.findMany({
      where: { companyId: 1 },
      include: { globalSkill: true },
      take: 5
    });

    return {
      totalGlobalSkills,
      globalSkills,
      skillsByCategory,
      selectedSkillsCount,
      companySelectedSkills
    };
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行時の処理
if (require.main === module) {
  checkGlobalSkills()
    .then(result => {
      console.log('=== グローバルスキル調査結果 ===');
      console.log(`総グローバルスキル数: ${result.totalGlobalSkills}`);
      console.log('\n最初の10件:');
      result.globalSkills.forEach(skill => {
        console.log(`- ID: ${skill.id}, 名前: ${skill.name}, カテゴリ: ${skill.category}`);
      });
      console.log('\nカテゴリ別数:');
      result.skillsByCategory.forEach(cat => {
        console.log(`- ${cat.category}: ${cat._count.id}件`);
      });
      console.log(`\n会社選択済みスキル総数: ${result.selectedSkillsCount}`);
      console.log('\n会社ID:1の選択済みスキル:');
      result.companySelectedSkills.forEach(skill => {
        console.log(`- ${skill.globalSkill?.name || 'null'} (グローバルスキルID: ${skill.globalSkillId})`);
      });
    })
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}

module.exports = { checkGlobalSkills };
