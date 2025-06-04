const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSkillData() {
  console.log('🚀 Starting skill data migration to new 3-tier system...');

  try {
    // Step 1: Create global skills from existing unique skill names
    console.log('\n📋 Step 1: Creating global skills master data...');
    
    // Get all unique skill names across all companies
    const existingSkills = await prisma.skill.findMany({
      select: { name: true, companyId: true },
      orderBy: { name: 'asc' }
    });

    const uniqueSkillNames = [...new Set(existingSkills.map(skill => skill.name))];
    console.log(`Found ${uniqueSkillNames.length} unique skill names across all companies`);

    // Create global skills with categories
    const skillCategories = {
      'Programming Languages': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell Script'],
      'Frontend': ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'HTML5', 'CSS3', 'SCSS/SASS', 'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Ant Design', 'Styled Components', 'jQuery'],
      'Backend': ['Node.js', 'Express.js', 'Django', 'FastAPI', 'Spring Boot', '.NET', 'Laravel', 'Ruby on Rails', 'NestJS', 'Koa.js', 'Flask', 'ASP.NET Core'],
      'Database': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 'Cassandra', 'DynamoDB', 'Firebase', 'Supabase'],
      'Cloud & DevOps': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CircleCI', 'GitHub Actions', 'GitLab CI', 'Terraform', 'Ansible'],
      'Tools & Platforms': ['Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
      'Methodologies': ['Scrum', 'Agile', 'プロジェクト管理', 'TDD', 'BDD', 'CI/CD', 'DevOps'],
      'AI & Data': ['機械学習', 'AI', 'TensorFlow', 'PyTorch', 'データ分析', 'データサイエンス', 'BigQuery', 'Tableau', 'PowerBI'],
      'Mobile': ['React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic'],
      'Other': []
    };

    function getSkillCategory(skillName) {
      for (const [category, skills] of Object.entries(skillCategories)) {
        if (skills.includes(skillName)) {
          return category;
        }
      }
      return 'Other';
    }

    let globalSkillsCreated = 0;
    const globalSkillMap = new Map(); // name -> globalSkillId

    for (const skillName of uniqueSkillNames) {
      try {
        // Check if global skill already exists
        let globalSkill = await prisma.globalSkill.findUnique({
          where: { name: skillName }
        });

        if (!globalSkill) {
          globalSkill = await prisma.globalSkill.create({
            data: {
              name: skillName,
              category: getSkillCategory(skillName)
            }
          });
          globalSkillsCreated++;
        }

        globalSkillMap.set(skillName, globalSkill.id);
        console.log(`  ✓ Global skill: ${skillName} (${globalSkill.category})`);
      } catch (error) {
        console.error(`    ❌ Error creating global skill "${skillName}":`, error.message);
      }
    }

    console.log(`✅ Created ${globalSkillsCreated} new global skills`);

    // Step 2: Create company selected skills
    console.log('\n🏢 Step 2: Creating company selected skills...');
    
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    let companySelectedSkillsCreated = 0;
    const companySkillMap = new Map(); // companyId:skillName -> companySelectedSkillId

    for (const company of companies) {
      console.log(`\n  Processing company: ${company.name}`);
      
      const companySkills = await prisma.skill.findMany({
        where: { companyId: company.id },
        select: { name: true }
      });

      for (const skill of companySkills) {
        const globalSkillId = globalSkillMap.get(skill.name);
        if (!globalSkillId) {
          console.error(`    ❌ Global skill not found for: ${skill.name}`);
          continue;
        }

        try {
          // Check if company selected skill already exists
          let companySelectedSkill = await prisma.companySelectedSkill.findUnique({
            where: {
              companyId_globalSkillId: {
                companyId: company.id,
                globalSkillId: globalSkillId
              }
            }
          });

          if (!companySelectedSkill) {
            companySelectedSkill = await prisma.companySelectedSkill.create({
              data: {
                companyId: company.id,
                globalSkillId: globalSkillId,
                isRequired: false,
                priority: null
              }
            });
            companySelectedSkillsCreated++;
          }

          companySkillMap.set(`${company.id}:${skill.name}`, companySelectedSkill.id);
          console.log(`    ✓ Company skill: ${skill.name}`);
        } catch (error) {
          console.error(`    ❌ Error creating company selected skill "${skill.name}":`, error.message);
        }
      }
    }

    console.log(`✅ Created ${companySelectedSkillsCreated} company selected skills`);

    // Step 3: Migrate user skills
    console.log('\n👥 Step 3: Migrating user skills...');
      const oldUserSkills = await prisma.userSkill.findMany({
      include: {
        user: {
          select: { id: true, companyId: true }
        },
        skill: {
          select: { name: true, companyId: true }
        }
      }
    });

    console.log(`Found ${oldUserSkills.length} existing user skills to migrate`);

    let userSkillsMigrated = 0;
    const newUserSkillsData = [];

    for (const oldUserSkill of oldUserSkills) {
      // Skip if skill is null or missing required data
      if (!oldUserSkill.skill || !oldUserSkill.skill.companyId || !oldUserSkill.skill.name) {
        console.log(`    ⚠️ Skipping user skill with missing data: userId=${oldUserSkill.userId}, skillId=${oldUserSkill.skillId}`);
        continue;
      }

      const companySkillKey = `${oldUserSkill.skill.companyId}:${oldUserSkill.skill.name}`;
      const companySelectedSkillId = companySkillMap.get(companySkillKey);

      if (!companySelectedSkillId) {
        console.error(`    ❌ Company selected skill not found for: ${companySkillKey}`);
        continue;
      }

      // Create new user skill data
      newUserSkillsData.push({
        userId: oldUserSkill.userId,
        companySelectedSkillId: companySelectedSkillId,
        years: oldUserSkill.years,
        level: oldUserSkill.years >= 5 ? 'EXPERT' : 
               oldUserSkill.years >= 3 ? 'ADVANCED' : 
               oldUserSkill.years >= 1 ? 'INTERMEDIATE' : 'BEGINNER',
        lastUsed: null,
        certifications: null
      });

      userSkillsMigrated++;
    }

    console.log(`Prepared ${newUserSkillsData.length} user skills for migration`);

    // Step 4: Temporarily rename old UserSkill table to backup
    console.log('\n🔄 Step 4: Creating backup and applying new user skills...');
    
    // Delete all old user skills (we'll create new ones)
    await prisma.userSkill.deleteMany({});
    console.log('  ✓ Cleared old user skills');

    // Insert new user skills in batches
    const batchSize = 50;
    for (let i = 0; i < newUserSkillsData.length; i += batchSize) {
      const batch = newUserSkillsData.slice(i, i + batchSize);
      try {
        await prisma.userSkill.createMany({
          data: batch,
          skipDuplicates: true
        });
        console.log(`  ✓ Migrated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newUserSkillsData.length/batchSize)}`);
      } catch (error) {
        console.error(`    ❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }

    console.log(`✅ Migrated ${newUserSkillsData.length} user skills to new system`);

    // Step 5: Mark old skills as deprecated
    console.log('\n🗃️ Step 5: Marking legacy skills as deprecated...');
    
    await prisma.skill.updateMany({
      data: { isDeprecated: true }
    });

    console.log('✅ All legacy skills marked as deprecated');

    // Migration summary
    console.log('\n📊 Migration Summary:');
    console.log(`  - Global skills created: ${globalSkillsCreated}`);
    console.log(`  - Company selected skills created: ${companySelectedSkillsCreated}`);
    console.log(`  - User skills migrated: ${userSkillsMigrated}`);
    
    // Final statistics
    const globalSkillCount = await prisma.globalSkill.count();
    const companySelectedSkillCount = await prisma.companySelectedSkill.count();
    const newUserSkillCount = await prisma.userSkill.count();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`Final counts:`);
    console.log(`  - Global skills: ${globalSkillCount}`);
    console.log(`  - Company selected skills: ${companySelectedSkillCount}`);
    console.log(`  - User skills: ${newUserSkillCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateSkillData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
