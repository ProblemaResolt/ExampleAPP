const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {

  try {
    // === グローバルスキルの作成 ===
    const globalSkills = [
      // プログラミング言語
      { name: 'JavaScript', category: 'プログラミング言語', description: 'JavaScript言語の知識と開発経験' },
      { name: 'TypeScript', category: 'プログラミング言語', description: 'TypeScript言語の知識と開発経験' },
      { name: 'Python', category: 'プログラミング言語', description: 'Python言語の知識と開発経験' },
      { name: 'Java', category: 'プログラミング言語', description: 'Java言語の知識と開発経験' },
      { name: 'C#', category: 'プログラミング言語', description: 'C#言語の知識と開発経験' },
      { name: 'Go', category: 'プログラミング言語', description: 'Go言語の知識と開発経験' },
      { name: 'PHP', category: 'プログラミング言語', description: 'PHP言語の知識と開発経験' },
      
      // フロントエンド
      { name: 'React', category: 'フロントエンド', description: 'Reactライブラリの知識と開発経験' },
      { name: 'Vue.js', category: 'フロントエンド', description: 'Vue.jsフレームワークの知識と開発経験' },
      { name: 'Angular', category: 'フロントエンド', description: 'Angularフレームワークの知識と開発経験' },
      { name: 'Next.js', category: 'フロントエンド', description: 'Next.jsフレームワークの知識と開発経験' },
      { name: 'HTML5', category: 'フロントエンド', description: 'HTML5マークアップ言語の知識' },
      { name: 'CSS3', category: 'フロントエンド', description: 'CSS3スタイルシートの知識' },
      
      // バックエンド
      { name: 'Node.js', category: 'バックエンド', description: 'Node.jsランタイムでの開発経験' },
      { name: 'Express.js', category: 'バックエンド', description: 'Express.jsフレームワークの知識' },
      { name: 'Spring Boot', category: 'バックエンド', description: 'Spring Bootフレームワークの知識' },
      { name: 'Django', category: 'バックエンド', description: 'Djangoフレームワークの知識' },
      { name: 'Laravel', category: 'バックエンド', description: 'Laravelフレームワークの知識' },
      
      // データベース
      { name: 'MySQL', category: 'データベース', description: 'MySQLデータベースの操作と管理' },
      { name: 'PostgreSQL', category: 'データベース', description: 'PostgreSQLデータベースの操作と管理' },
      { name: 'MongoDB', category: 'データベース', description: 'MongoDBの操作と管理' },
      { name: 'Redis', category: 'データベース', description: 'Redisインメモリデータストアの知識' },
      
      // クラウド・インフラ
      { name: 'AWS', category: 'クラウド', description: 'Amazon Web Servicesの知識と運用経験' },
      { name: 'Azure', category: 'クラウド', description: 'Microsoft Azureの知識と運用経験' },
      { name: 'Docker', category: 'インフラ', description: 'Dockerコンテナ技術の知識と運用経験' },
      { name: 'Kubernetes', category: 'インフラ', description: 'Kubernetesオーケストレーションの知識' },
      { name: 'Git', category: 'ツール', description: 'Gitバージョン管理システムの知識' }
    ];

    for (const skill of globalSkills) {
      await prisma.globalSkill.upsert({
        where: { name: skill.name },
        update: {},
        create: skill
      });
    }

    // === 管理者ユーザーの作成 ===
    const adminUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'システム',
        lastName: '管理者',
        phone: '03-1234-5678',
        prefecture: '東京都',
        city: '千代田区',
        streetAddress: '大手町1-1-1 大手町ビル10F'
      },
      {
        email: 'admin2@example.com',
        password: 'admin123',
        firstName: 'システム',
        lastName: '副管理者',
        phone: '06-9876-5432',
        prefecture: '大阪府',
        city: '大阪市北区',
        streetAddress: '梅田2-2-2 梅田スカイビル20F'
      },
      {
        email: 'superadmin@example.com',
        password: 'admin123',
        firstName: 'スーパー',
        lastName: '管理者',
        phone: '052-1111-2222',
        prefecture: '愛知県',
        city: '名古屋市中村区',
        streetAddress: '名駅3-3-3 JRセントラルタワーズ15F'
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
            phone: adminData.phone,
            prefecture: adminData.prefecture,
            city: adminData.city,
            streetAddress: adminData.streetAddress,
            isEmailVerified: true,
            isActive: true
          }
        });
      } else {
      }
    }

    // === 会社の作成 ===
    const companies = [
      {
        name: '株式会社テクノロジーワン',
        description: '革新的なWebアプリケーション開発を手がける技術企業',
        email: 'info@techone.co.jp',
        phone: '045-3333-4444',
        address: '神奈川県横浜市西区みなとみらい4-4-4 ランドマークタワー25F',
        managerEmail: 'company1@example.com',
        managerData: {
          email: 'company1@example.com',
          password: 'Company123!',
          firstName: '山田',
          lastName: '太郎',
          phone: '045-3333-4444',
          prefecture: '神奈川県',
          city: '横浜市西区',
          streetAddress: 'みなとみらい4-4-4 ランドマークタワー25F'
        }
      },
      {
        name: '株式会社イノベーションラボ',
        description: 'AI・機械学習技術を活用したソリューション提供企業',
        email: 'contact@innovation-lab.co.jp',
        phone: '075-5555-6666',
        address: '京都府京都市下京区烏丸通五条下る5-5-5 京都タワービル8F',
        managerEmail: 'company2@example.com',
        managerData: {
          email: 'company2@example.com',
          password: 'Company123!',
          firstName: '佐藤',
          lastName: '花子',
          phone: '075-5555-6666',
          prefecture: '京都府',
          city: '京都市下京区',
          streetAddress: '烏丸通五条下る5-5-5 京都タワービル8F'
        }
      },
      {
        name: '合同会社デジタルソリューションズ',
        description: 'デジタルトランスフォーメーション支援企業',
        email: 'hello@digital-solutions.co.jp',
        phone: '092-7777-8888',
        address: '福岡県福岡市博多区博多駅前6-6-6 博多駅前ビル12F',
        managerEmail: 'company3@example.com',
        managerData: {
          email: 'company3@example.com',
          password: 'Company123!',
          firstName: '田中',
          lastName: '次郎',
          phone: '092-7777-8888',
          prefecture: '福岡県',
          city: '福岡市博多区',
          streetAddress: '博多駅前6-6-6 博多駅前ビル12F'
        }
      }
    ];

    const createdCompanies = [];
    for (const companyInfo of companies) {
      const existingCompany = await prisma.company.findUnique({
        where: { name: companyInfo.name }
      });

      if (!existingCompany) {
        // 会社管理者ユーザーの作成
        const hashedPassword = await bcrypt.hash(companyInfo.managerData.password, 10);
        
        const company = await prisma.company.create({
          data: {
            name: companyInfo.name,
            description: companyInfo.description,
            email: companyInfo.email
          }
        });

        const companyManager = await prisma.user.create({
          data: {
            email: companyInfo.managerData.email,
            password: hashedPassword,
            firstName: companyInfo.managerData.firstName,
            lastName: companyInfo.managerData.lastName,
            role: 'COMPANY',
            phone: companyInfo.managerData.phone,
            prefecture: companyInfo.managerData.prefecture,
            city: companyInfo.managerData.city,
            streetAddress: companyInfo.managerData.streetAddress,
            isEmailVerified: true,
            isActive: true,
            companyId: company.id,
            managedCompanyId: company.id
          }
        });

        await prisma.company.update({
          where: { id: company.id },
          data: { managerId: companyManager.id }
        });

        createdCompanies.push({ company, manager: companyManager });
      } else {
        const manager = await prisma.user.findUnique({
          where: { email: companyInfo.managerEmail }
        });
        createdCompanies.push({ company: existingCompany, manager });
      }
    }

    // === 社員ユーザーの作成 ===
    const employeeData = [
      // 会社1の社員
      {
        companyIndex: 0,
        users: [
          {
            email: 'manager1@techone.co.jp',
            password: 'Manager123!',
            firstName: '鈴木',
            lastName: '一郎',
            role: 'MANAGER',
            position: 'プロジェクトマネージャー',
            phone: '045-1111-2222',
            prefecture: '神奈川県',
            city: '横浜市中区',
            streetAddress: '本町3-1-1 横浜マンション201'
          },
          {
            email: 'lead1@techone.co.jp',
            password: 'Lead123!',
            firstName: '高橋',
            lastName: '美咲',
            role: 'MANAGER',
            position: 'テックリード',
            phone: '045-2222-3333',
            prefecture: '神奈川県',
            city: '川崎市中原区',
            streetAddress: '武蔵小杉2-2-2 タワーマンション305'
          },
          {
            email: 'dev1@techone.co.jp',
            password: 'Dev123!',
            firstName: '伊藤',
            lastName: '健太',
            role: 'MEMBER',
            position: 'フロントエンドエンジニア',
            phone: '045-3333-4444',
            prefecture: '神奈川県',
            city: '横浜市港北区',
            streetAddress: '新横浜1-1-1 新横浜アパート101'
          },
          {
            email: 'dev2@techone.co.jp',
            password: 'Dev123!',
            firstName: '渡辺',
            lastName: '優子',
            role: 'MEMBER',
            position: 'バックエンドエンジニア',
            phone: '045-4444-5555',
            prefecture: '神奈川県',
            city: '横浜市西区',
            streetAddress: 'みなとみらい6-6-6 シーサイドマンション203'
          },
          {
            email: 'designer1@techone.co.jp',
            password: 'Design123!',
            firstName: '中村',
            lastName: '愛',
            role: 'MEMBER',
            position: 'UIUXデザイナー',
            phone: '045-5555-6666',
            prefecture: '神奈川県',
            city: '横浜市中区',
            streetAddress: '関内4-4-4 関内レジデンス402'
          }
        ]
      },
      // 会社2の社員
      {
        companyIndex: 1,
        users: [
          {
            email: 'manager2@innovation-lab.co.jp',
            password: 'Manager123!',
            firstName: '小林',
            lastName: '大輔',
            role: 'MANAGER',
            position: 'AIプロジェクトマネージャー',
            phone: '075-1111-2222',
            prefecture: '京都府',
            city: '京都市中京区',
            streetAddress: '河原町通三条上る1-1-1 京都マンション301'
          },
          {
            email: 'researcher1@innovation-lab.co.jp',
            password: 'Research123!',
            firstName: '加藤',
            lastName: '智子',
            role: 'MEMBER',
            position: 'AI研究員',
            phone: '075-2222-3333',
            prefecture: '京都府',
            city: '京都市左京区',
            streetAddress: '吉田本町2-2-2 京大前アパート201'
          },
          {
            email: 'engineer1@innovation-lab.co.jp',
            password: 'Engineer123!',
            firstName: '山本',
            lastName: '拓也',
            role: 'MEMBER',
            position: '機械学習エンジニア',
            phone: '075-3333-4444',
            prefecture: '京都府',
            city: '京都市右京区',
            streetAddress: '西院町3-3-3 西院レジデンス105'
          }
        ]
      },
      // 会社3の社員
      {
        companyIndex: 2,
        users: [
          {
            email: 'manager3@digital-solutions.co.jp',
            password: 'Manager123!',
            firstName: '森田',
            lastName: '裕介',
            role: 'MANAGER',
            position: 'DXコンサルタント',
            phone: '092-1111-2222',
            prefecture: '福岡県',
            city: '福岡市中央区',
            streetAddress: '天神1-1-1 天神タワー501'
          },
          {
            email: 'consultant1@digital-solutions.co.jp',
            password: 'Consult123!',
            firstName: '清水',
            lastName: '麻衣',
            role: 'MEMBER',
            position: 'ITコンサルタント',
            phone: '092-2222-3333',
            prefecture: '福岡県',
            city: '福岡市博多区',
            streetAddress: '博多駅南2-2-2 博多南マンション203'
          },
          {
            email: 'analyst1@digital-solutions.co.jp',
            password: 'Analyst123!',
            firstName: '橋本',
            lastName: '雄二',
            role: 'MEMBER',
            position: 'データアナリスト',
            phone: '092-3333-4444',
            prefecture: '福岡県',
            city: '福岡市早良区',
            streetAddress: '西新3-3-3 西新アパート301'
          }
        ]
      }
    ];

    for (const companyEmployees of employeeData) {
      const company = createdCompanies[companyEmployees.companyIndex].company;
      
      for (const userData of companyEmployees.users) {
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await prisma.user.create({
            data: {
              email: userData.email,
              password: hashedPassword,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              position: userData.position,
              phone: userData.phone,
              prefecture: userData.prefecture,
              city: userData.city,
              streetAddress: userData.streetAddress,
              isEmailVerified: true,
              isActive: true,
              companyId: company.id
            }
          });
        } else {
        }
      }
    }

    // === プロジェクトの作成 ===
    const projects = [
      {
        companyIndex: 0,
        projects: [
          {
            name: 'ECサイトリニューアルプロジェクト',
            description: '大手小売企業のECサイト全面リニューアル',
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-06-30'),
            clientCompanyName: '株式会社リテールマート',
            clientContactName: '営業部 田村様',
            clientContactEmail: 'tamura@retailmart.co.jp'
          },
          {
            name: '在庫管理システム開発',
            description: '倉庫業務効率化のための在庫管理システム開発',
            startDate: new Date('2024-03-01'),
            endDate: new Date('2024-08-31'),
            clientCompanyName: '物流センター株式会社',
            clientContactName: 'システム部 佐々木様',
            clientContactEmail: 'sasaki@logistics.co.jp'
          }
        ]
      },
      {
        companyIndex: 1,
        projects: [
          {
            name: 'AI画像解析システム',
            description: '製造業向けAI画像解析による品質管理システム',
            startDate: new Date('2024-02-01'),
            endDate: new Date('2024-09-30'),
            clientCompanyName: '製造技術株式会社',
            clientContactName: '技術部 山口様',
            clientContactEmail: 'yamaguchi@manufacturing.co.jp'
          }
        ]
      },
      {
        companyIndex: 2,
        projects: [
          {
            name: 'DX推進コンサルティング',
            description: '金融機関のデジタルトランスフォーメーション支援',
            startDate: new Date('2024-01-10'),
            endDate: new Date('2024-12-31'),
            clientCompanyName: '地方銀行株式会社',
            clientContactName: '企画部 林様',
            clientContactEmail: 'hayashi@localbank.co.jp'
          }
        ]
      }
    ];

    for (const companyProjects of projects) {
      const company = createdCompanies[companyProjects.companyIndex].company;
      
      for (const projectData of companyProjects.projects) {
        const existingProject = await prisma.project.findFirst({
          where: {
            name: projectData.name,
            companyId: company.id
          }
        });

        if (!existingProject) {
          const project = await prisma.project.create({
            data: {
              name: projectData.name,
              description: projectData.description,
              startDate: projectData.startDate,
              endDate: projectData.endDate,
              clientCompanyName: projectData.clientCompanyName,
              clientContactName: projectData.clientContactName,
              clientContactEmail: projectData.clientContactEmail,
              companyId: company.id
            }
          });
        } else {
        }
      }
    }


  } catch (error) {
    console.error('❌ シードエラー:', error);
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
