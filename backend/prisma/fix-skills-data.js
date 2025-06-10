const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {

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

    // 既存の会社一覧を取得
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });


    // 各会社にデフォルトスキルセットを作成
    for (const company of companies) {
      
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
      
    }    // 統計情報を表示
    const totalSkills = await prisma.skill.count();
    const skillsByCompany = await prisma.skill.groupBy({
      by: ['companyId'],
      _count: {
        id: true
      }
    });

      for (const group of skillsByCompany) {
      const company = companies.find(c => c.id === group.companyId);
      const companyName = company?.name || 'Unknown';
    }


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
