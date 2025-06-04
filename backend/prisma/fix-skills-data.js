const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting skills data fix...');

  try {
    // デフォルトスキルセット
    const defaultSkills = [
      'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular',
      'Node.js', 'Express.js', 'Python', 'Django', 'FastAPI',
      'Java', 'Spring Boot', 'C#', '.NET', 'PHP', 'Laravel',
      'Go', 'Rust', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Git', 'GitHub', 'GitLab', 'Jenkins', 'CircleCI',
      'UI/UXデザイン', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
      'プロジェクト管理', 'Scrum', 'Agile', 'Jira', 'Confluence',
      'データ分析', '機械学習', 'AI', 'TensorFlow', 'PyTorch'
    ];    // 既存のスキル数を確認
    const existingSkillsCount = await prisma.skill.count();
    console.log(`Current skills in database: ${existingSkillsCount}`);

    // 既存の会社一覧を取得
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    console.log(`Found ${companies.length} companies`);

    // 各会社にデフォルトスキルセットを作成
    for (const company of companies) {
      console.log(`Creating skills for company: ${company.name}`);
      
      let skillsCreated = 0;
      
      for (const skillName of defaultSkills) {
        // 既存のスキルをチェック
        const existingSkill = await prisma.skill.findFirst({
          where: { 
            name: skillName,
            companyId: company.id
          }
        });

        if (!existingSkill) {
          try {
            await prisma.skill.create({
              data: { 
                name: skillName,
                companyId: company.id
              }
            });
            skillsCreated++;
          } catch (error) {
            console.error(`Error creating skill "${skillName}" for company "${company.name}":`, error.message);
          }
        }
      }
      
      console.log(`  ✓ Created ${skillsCreated} new skills for ${company.name}`);
    }    // 統計情報を表示
    const totalSkills = await prisma.skill.count();
    const skillsByCompany = await prisma.skill.groupBy({
      by: ['companyId'],
      _count: {
        id: true
      }
    });

    console.log('\n=== Skills Data Fix Summary ===');
    console.log(`Total skills in database: ${totalSkills}`);
    console.log('Skills by company:');
      for (const group of skillsByCompany) {
      const company = companies.find(c => c.id === group.companyId);
      const companyName = company?.name || 'Unknown';
      console.log(`  ${companyName}: ${group._count.id} skills`);
    }

    console.log('\n✅ Skills data fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during skills data fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
