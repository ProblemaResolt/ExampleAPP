const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting extended data seeding...');

  try {
    // === ADMIN ユーザーの作成（複数） ===
    console.log('Creating ADMIN users...');
    const adminUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'システム',
        lastName: '管理者'
      },
      {
        email: 'admin2@example.com',
        password: 'admin123',
        firstName: '田中',
        lastName: '管理太郎'
      },
      {
        email: 'superadmin@example.com',
        password: 'admin123',
        firstName: 'スーパー',
        lastName: '管理者'
      }
    ];

    for (const adminData of adminUsers) {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminData.email }
      });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        await prisma.user.create({
          data: {
            email: adminData.email,
            password: hashedPassword,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            role: 'ADMIN',
            isEmailVerified: true,
            isActive: true
          }
        });
        console.log(`✓ Created ADMIN user: ${adminData.email}`);
      } else {
        console.log(`- ADMIN user already exists: ${adminData.email}`);
      }
    }

    // === 会社とCOMPANYユーザーの作成（複数会社） ===
    console.log('\nCreating companies and COMPANY users...');
    const companiesData = [
      {
        email: 'company1@example.com',
        password: 'Company123!',
        firstName: '山田',
        lastName: '社長',
        companyName: '株式会社サンプル1',
        description: 'ITソリューション開発会社',
        website: 'https://sample1.com'
      },
      {
        email: 'company2@example.com',
        password: 'Company123!',
        firstName: '佐藤',
        lastName: '代表',
        companyName: '株式会社テクノロジー',
        description: 'AI・機械学習技術の開発',
        website: 'https://technology.com'
      },
      {
        email: 'company3@example.com',
        password: 'Company123!',
        firstName: '鈴木',
        lastName: 'CEO',
        companyName: '合同会社イノベーション',
        description: 'スタートアップ向けMVP開発',
        website: 'https://innovation.com'
      }
    ];

    // 各会社のユーザーデータ
    const companyUsersData = {
      '株式会社サンプル1': [
        // MANAGERs
        {
          email: 'manager1@sample1.com',
          password: 'Manager123!',
          firstName: '田中',
          lastName: '太郎',
          role: 'MANAGER',
          position: 'プロジェクトマネージャー'
        },
        {
          email: 'manager2@sample1.com',
          password: 'Manager123!',
          firstName: '佐藤',
          lastName: '花子',
          role: 'MANAGER',
          position: 'テックリード'
        },
        {
          email: 'manager3@sample1.com',
          password: 'Manager123!',
          firstName: '高橋',
          lastName: '次郎',
          role: 'MANAGER',
          position: 'スクラムマスター'
        },
        // MEMBERs
        {
          email: 'member1@sample1.com',
          password: 'Member123!',
          firstName: '鈴木',
          lastName: '一郎',
          role: 'MEMBER',
          position: 'フロントエンドエンジニア'
        },
        {
          email: 'member2@sample1.com',
          password: 'Member123!',
          firstName: '伊藤',
          lastName: '美咲',
          role: 'MEMBER',
          position: 'バックエンドエンジニア'
        },
        {
          email: 'member3@sample1.com',
          password: 'Member123!',
          firstName: '渡辺',
          lastName: '健二',
          role: 'MEMBER',
          position: 'UIUXデザイナー'
        },
        {
          email: 'member4@sample1.com',
          password: 'Member123!',
          firstName: '中村',
          lastName: 'さくら',
          role: 'MEMBER',
          position: 'QAエンジニア'
        },
        {
          email: 'member5@sample1.com',
          password: 'Member123!',
          firstName: '小林',
          lastName: '拓也',
          role: 'MEMBER',
          position: 'データベースエンジニア'
        }
      ],
      '株式会社テクノロジー': [
        // MANAGERs
        {
          email: 'manager1@tech.com',
          password: 'Manager123!',
          firstName: '山田',
          lastName: '誠',
          role: 'MANAGER',
          position: 'エンジニアリングマネージャー'
        },
        {
          email: 'manager2@tech.com',
          password: 'Manager123!',
          firstName: '青木',
          lastName: '麻衣',
          role: 'MANAGER',
          position: 'AIプロダクトマネージャー'
        },
        // MEMBERs
        {
          email: 'member1@tech.com',
          password: 'Member123!',
          firstName: '松本',
          lastName: '雄大',
          role: 'MEMBER',
          position: 'データサイエンティスト'
        },
        {
          email: 'member2@tech.com',
          password: 'Member123!',
          firstName: '森田',
          lastName: 'ゆい',
          role: 'MEMBER',
          position: 'MLエンジニア'
        },
        {
          email: 'member3@tech.com',
          password: 'Member123!',
          firstName: '石川',
          lastName: '直樹',
          role: 'MEMBER',
          position: 'DevOpsエンジニア'
        },
        {
          email: 'member4@tech.com',
          password: 'Member123!',
          firstName: '前田',
          lastName: 'あやか',
          role: 'MEMBER',
          position: 'クラウドアーキテクト'
        }
      ],
      '合同会社イノベーション': [
        // MANAGERs
        {
          email: 'manager1@innovation.com',
          password: 'Manager123!',
          firstName: '藤田',
          lastName: '智也',
          role: 'MANAGER',
          position: 'プロダクトマネージャー'
        },
        // MEMBERs
        {
          email: 'member1@innovation.com',
          password: 'Member123!',
          firstName: '岡田',
          lastName: '美優',
          role: 'MEMBER',
          position: 'フルスタックエンジニア'
        },
        {
          email: 'member2@innovation.com',
          password: 'Member123!',
          firstName: '井上',
          lastName: '翔太',
          role: 'MEMBER',
          position: 'モバイルエンジニア'
        },
        {
          email: 'member3@innovation.com',
          password: 'Member123!',
          firstName: '西田',
          lastName: 'かおり',
          role: 'MEMBER',
          position: 'グロースハッカー'
        }
      ]
    };

    // 会社とユーザーを作成
    for (const companyData of companiesData) {
      const existingUser = await prisma.user.findUnique({
        where: { email: companyData.email },
        include: { managedCompany: true }
      });

      if (!existingUser) {
        console.log(`Creating company: ${companyData.companyName}`);
        
        // 会社を作成
        const company = await prisma.company.create({
          data: {
            name: companyData.companyName,
            description: companyData.description,
            website: companyData.website,
            email: companyData.email
          }
        });

        // 会社管理者ユーザーを作成
        const hashedPassword = await bcrypt.hash(companyData.password, 10);
        const companyUser = await prisma.user.create({
          data: {
            email: companyData.email,
            password: hashedPassword,
            firstName: companyData.firstName,
            lastName: companyData.lastName,
            role: 'COMPANY',
            position: 'CEO',
            isEmailVerified: true,
            isActive: true,
            companyId: company.id
          }
        });

        // 会社管理者の関連付けを更新
        await prisma.company.update({
          where: { id: company.id },
          data: { managerId: companyUser.id }
        });

        await prisma.user.update({
          where: { id: companyUser.id },
          data: { managedCompanyId: company.id }
        });

        console.log(`✓ Created COMPANY user: ${companyData.email}`);

        // 会社所属のユーザーを作成
        const usersForCompany = companyUsersData[companyData.companyName] || [];
        
        for (const userData of usersForCompany) {
          const existingCompanyUser = await prisma.user.findUnique({
            where: { email: userData.email }
          });

          if (!existingCompanyUser) {
            const userHashedPassword = await bcrypt.hash(userData.password, 10);
            await prisma.user.create({
              data: {
                email: userData.email,
                password: userHashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                role: userData.role,
                position: userData.position,
                isEmailVerified: true,
                isActive: true,
                companyId: company.id
              }
            });
            console.log(`  ✓ Created ${userData.role} user: ${userData.email} (${userData.firstName} ${userData.lastName})`);
          }
        }
        
        console.log(`  → Total users created for ${companyData.companyName}: ${usersForCompany.length + 1}\n`);
      } else {
        console.log(`- Company already exists: ${companyData.companyName}`);
      }
    }    // === スキルマスタデータの作成（各会社に対して） ===
    console.log('Creating skill master data for each company...');
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
    ];

    // 各会社にデフォルトスキルセットを作成
    const allCompanies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    for (const company of allCompanies) {
      console.log(`Creating skills for company: ${company.name}`);
      
      for (const skillName of defaultSkills) {
        const existingSkill = await prisma.skill.findFirst({
          where: { 
            name: skillName,
            companyId: company.id
          }
        });

        if (!existingSkill) {
          await prisma.skill.create({
            data: { 
              name: skillName,
              companyId: company.id
            }
          });
          console.log(`  ✓ Created skill: ${skillName} for ${company.name}`);
        }
      }
    }

    // === 統計情報の表示 ===
    console.log('\n=== Seeding Summary ===');
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const companyCounts = await prisma.company.count();
    const skillCounts = await prisma.skill.count();

    console.log(`Total companies: ${companyCounts}`);
    console.log(`Total skills: ${skillCounts}`);
    console.log('Users by role:');
    for (const count of userCounts) {
      console.log(`  ${count.role}: ${count._count} users`);
    }

    console.log('\n✅ Extended seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
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
