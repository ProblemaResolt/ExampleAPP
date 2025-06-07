const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 統合データシード開始...\n');

  try {
    // === グローバルスキルの作成 ===
    console.log('📋 グローバルスキルの作成...');    const globalSkills = [
      // プログラミング言語
      { name: 'JavaScript', category: 'プログラミング言語', description: 'JavaScript言語の知識と開発経験' },
      { name: 'TypeScript', category: 'プログラミング言語', description: 'TypeScript言語の知識と開発経験' },
      { name: 'Python', category: 'プログラミング言語', description: 'Python言語の知識と開発経験' },
      { name: 'Java', category: 'プログラミング言語', description: 'Java言語の知識と開発経験' },
      { name: 'C#', category: 'プログラミング言語', description: 'C#言語の知識と開発経験' },
      { name: 'Go', category: 'プログラミング言語', description: 'Go言語の知識と開発経験' },
      { name: 'Rust', category: 'プログラミング言語', description: 'Rust言語の知識と開発経験' },
      { name: 'PHP', category: 'プログラミング言語', description: 'PHP言語の知識と開発経験' },
      
      // フロントエンド
      { name: 'React', category: 'フロントエンド', description: 'Reactライブラリの知識と開発経験' },
      { name: 'Vue.js', category: 'フロントエンド', description: 'Vue.jsフレームワークの知識と開発経験' },
      { name: 'Angular', category: 'フロントエンド', description: 'Angularフレームワークの知識と開発経験' },
      { name: 'Next.js', category: 'フロントエンド', description: 'Next.jsフレームワークの知識と開発経験' },
      { name: 'Nuxt.js', category: 'フロントエンド', description: 'Nuxt.jsフレームワークの知識と開発経験' },
      { name: 'HTML5', category: 'フロントエンド', description: 'HTML5マークアップ言語の知識' },
      { name: 'CSS3', category: 'フロントエンド', description: 'CSS3スタイルシートの知識' },
      { name: 'Sass/SCSS', category: 'フロントエンド', description: 'SassやSCSSプリプロセッサの知識' },
      
      // バックエンド
      { name: 'Node.js', category: 'バックエンド', description: 'Node.jsランタイムでの開発経験' },
      { name: 'Express.js', category: 'バックエンド', description: 'Express.jsフレームワークの知識' },
      { name: 'Spring Boot', category: 'バックエンド', description: 'Spring Bootフレームワークの知識' },
      { name: 'Django', category: 'バックエンド', description: 'Djangoフレームワークの知識' },
      { name: 'Flask', category: 'バックエンド', description: 'Flaskフレームワークの知識' },
      { name: 'Laravel', category: 'バックエンド', description: 'Laravelフレームワークの知識' },
      { name: 'ASP.NET Core', category: 'バックエンド', description: 'ASP.NET Coreフレームワークの知識' },
      
      // データベース
      { name: 'MySQL', category: 'データベース', description: 'MySQLデータベースの操作と管理' },
      { name: 'PostgreSQL', category: 'データベース', description: 'PostgreSQLデータベースの操作と管理' },
      { name: 'MongoDB', category: 'データベース', description: 'MongoDBの操作と管理' },
      { name: 'Redis', category: 'データベース', description: 'Redisインメモリデータストアの知識' },
      { name: 'Oracle Database', category: 'データベース', description: 'Oracle Databaseの操作と管理' },
      { name: 'SQL Server', category: 'データベース', description: 'Microsoft SQL Serverの操作と管理' },
      
      // クラウド
      { name: 'AWS', category: 'クラウド', description: 'Amazon Web Servicesの知識と運用経験' },
      { name: 'Azure', category: 'クラウド', description: 'Microsoft Azureの知識と運用経験' },
      { name: 'Google Cloud Platform', category: 'クラウド', description: 'Google Cloud Platformの知識と運用経験' },
      
      // DevOps・インフラ
      { name: 'Docker', category: 'DevOps', description: 'Dockerコンテナ技術の知識' },
      { name: 'Kubernetes', category: 'DevOps', description: 'Kubernetesオーケストレーション技術' },
      { name: 'Jenkins', category: 'DevOps', description: 'JenkinsCI/CDツールの知識' },
      { name: 'GitHub Actions', category: 'DevOps', description: 'GitHub Actionsの知識と設定経験' },
      { name: 'Terraform', category: 'DevOps', description: 'TerraformInfrastructure as Codeツールの知識' },
      
      // ツール・その他
      { name: 'Git', category: 'ツール', description: 'Gitバージョン管理システムの操作' },
      { name: 'Linux', category: 'OS', description: 'Linuxオペレーティングシステムの操作' },
      { name: 'Windows Server', category: 'OS', description: 'Windows Serverの管理と運用' },
      { name: 'Figma', category: 'デザイン', description: 'FigmaデザインツールでのUI/UXデザイン' },
      { name: 'Photoshop', category: 'デザイン', description: 'Adobe Photoshopでの画像編集スキル' },
      { name: 'Illustrator', category: 'デザイン', description: 'Adobe Illustratorでのベクターデザイン' },
      
      // モバイル
      { name: 'React Native', category: 'モバイル', description: 'React Nativeでのモバイルアプリ開発' },
      { name: 'Flutter', category: 'モバイル', description: 'Flutterでのクロスプラットフォーム開発' },
      { name: 'Swift', category: 'モバイル', description: 'SwiftでのiOSアプリ開発' },
      { name: 'Kotlin', category: 'モバイル', description: 'KotlinでのAndroidアプリ開発' },
      
      // 機械学習・AI
      { name: 'TensorFlow', category: '機械学習', description: 'TensorFlow機械学習フレームワークの知識' },
      { name: 'PyTorch', category: '機械学習', description: 'PyTorch機械学習フレームワークの知識' },
      { name: 'scikit-learn', category: '機械学習', description: 'scikit-learn機械学習ライブラリの知識' },
      { name: 'OpenAI API', category: '機械学習', description: 'OpenAI APIの活用経験' }
    ];

    for (const skill of globalSkills) {
      await prisma.globalSkill.upsert({
        where: { name: skill.name },
        update: {},
        create: skill
      });
    }
    console.log(`✓ ${globalSkills.length}個のグローバルスキルを作成`);

    // === 管理者ユーザーの作成 ===
    console.log('\n👑 管理者ユーザーの作成...');    const adminUsers = [
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
      },
      // === 元々のユーザー（復旧） ===
      {
        email: 'company1@example.com',
        password: 'Company123!',
        firstName: '会社',
        lastName: '管理者1',
        role: 'COMPANY'
      },
      {
        email: 'user1@example.com', 
        password: 'User123!',
        firstName: 'ユーザー',
        lastName: '1',
        role: 'MEMBER'
      },
      {
        email: 'manager1@example.com',
        password: 'Manager123!', 
        firstName: 'マネージャー',
        lastName: '1',
        role: 'MANAGER'
      }
    ];

    for (const adminData of adminUsers) {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminData.email }
      });

      if (!existingAdmin) {
        console.log(`Creating admin user: ${adminData.email}`);
        const hashedPassword = await bcrypt.hash(adminData.password, 10);        await prisma.user.create({
          data: {
            email: adminData.email,
            password: hashedPassword,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            role: adminData.role || 'ADMIN',
            isEmailVerified: true,
            isActive: true,
            phone: adminData.phone,
            prefecture: adminData.prefecture,
            city: adminData.city,
            streetAddress: adminData.streetAddress
          }
        });
        console.log(`Admin user created successfully: ${adminData.email}`);
      } else {
        console.log(`Admin user already exists: ${adminData.email}`);
      }
    }    // === 会社データの作成 ===
    console.log('\n🏢 会社データの作成...');
    const companyData = [
      {
        email: 'info@techcorp.jp',
        password: 'TechCorp2024!',
        firstName: '田中',
        lastName: '太郎',
        companyName: '株式会社テックコーポレーション',
        description: '最新技術を駆使したソフトウェア開発会社。AI・機械学習、クラウドソリューションを専門とし、企業のDXを支援しています。',
        website: 'https://techcorp.jp',
        foundedYear: 2015,
        industryType: 'IT・ソフトウェア',
        phone: '03-5678-9012',
        prefecture: '東京都',
        city: '渋谷区',
        streetAddress: '恵比寿3-4-5 テックビル8F'
      },
      {
        email: 'contact@digitalsolutions.co.jp',
        password: 'Digital2024!',
        firstName: '佐藤',
        lastName: '花子',
        companyName: 'デジタルソリューションズ株式会社',
        description: 'デジタルトランスフォーメーションのパートナーとして、Web開発、モバイルアプリ開発、システム統合を提供しています。',
        website: 'https://digitalsolutions.co.jp',
        foundedYear: 2010,
        industryType: 'IT・コンサルティング',
        phone: '06-7890-1234',
        prefecture: '大阪府',
        city: '大阪市中央区',
        streetAddress: '本町1-2-3 ソリューションタワー12F'
      },
      {
        email: 'hello@innovativetech.com',
        password: 'Innovation2024!',
        firstName: '鈴木',
        lastName: '一郎',
        companyName: '合同会社イノベーティブテック',
        description: 'スタートアップ精神を大切にし、革新的なプロダクト開発と次世代技術の研究開発を行っています。',
        website: 'https://innovativetech.com',
        foundedYear: 2018,
        industryType: 'IT・スタートアップ',
        phone: '052-3456-7890',
        prefecture: '愛知県',
        city: '名古屋市中区',
        streetAddress: '栄4-5-6 イノベーションセンター7F'
      }
    ];    for (const [index, data] of companyData.entries()) {
      const existingCompany = await prisma.company.findUnique({
        where: { name: data.companyName }
      });

      if (!existingCompany) {
        console.log(`📊 ${data.companyName} を作成中...`);
          // 会社を作成
        const company = await prisma.company.create({
          data: {
            name: data.companyName,
            description: data.description,
            email: data.email,
            website: data.website,
            phone: data.phone,
            address: `${data.prefecture}${data.city}${data.streetAddress}`
          }
        });

        // 会社管理者ユーザーを作成
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const companyAdmin = await prisma.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'COMPANY',
            position: '代表取締役',
            isEmailVerified: true,
            isActive: true,
            companyId: company.id,
            phone: data.phone,
            prefecture: data.prefecture,
            city: data.city,
            streetAddress: data.streetAddress
          }
        });

        // 会社の管理者を設定
        await prisma.company.update({
          where: { id: company.id },
          data: { managerId: companyAdmin.id }
        });

        await prisma.user.update({
          where: { id: companyAdmin.id },
          data: { managedCompanyId: company.id }
        });

        console.log(`✓ ${data.companyName} 作成完了`);

        // === 各会社の従業員ユーザーの作成 ===
        console.log(`👥 ${data.companyName} の従業員を作成中...`);
        
        let employees = [];
        if (index === 0) { // テックコーポレーション
          employees = [
            { email: 'yamada@techcorp.jp', firstName: '山田', lastName: '太郎', role: 'MANAGER', position: 'プロジェクトマネージャー', phone: '090-1234-5678', prefecture: '東京都', city: '世田谷区', streetAddress: '三軒茶屋1-2-3' },
            { email: 'tanaka@techcorp.jp', firstName: '田中', lastName: '花子', role: 'MANAGER', position: 'テックリード', phone: '090-2345-6789', prefecture: '神奈川県', city: '横浜市中区', streetAddress: 'みなとみらい2-3-4' },
            { email: 'sato@techcorp.jp', firstName: '佐藤', lastName: '次郎', role: 'MEMBER', position: 'シニアエンジニア', phone: '090-3456-7890', prefecture: '東京都', city: '新宿区', streetAddress: '新宿3-4-5' },
            { email: 'suzuki@techcorp.jp', firstName: '鈴木', lastName: '美咲', role: 'MEMBER', position: 'フロントエンドエンジニア', phone: '090-4567-8901', prefecture: '千葉県', city: '千葉市中央区', streetAddress: '中央1-2-3' },
            { email: 'takahashi@techcorp.jp', firstName: '高橋', lastName: '健太', role: 'MEMBER', position: 'バックエンドエンジニア', phone: '090-5678-9012', prefecture: '埼玉県', city: 'さいたま市大宮区', streetAddress: '大宮2-3-4' },
            { email: 'ito@techcorp.jp', firstName: '伊藤', lastName: '麻衣', role: 'MEMBER', position: 'UIデザイナー', phone: '090-6789-0123', prefecture: '東京都', city: '品川区', streetAddress: '大崎3-4-5' }
          ];
        } else if (index === 1) { // デジタルソリューションズ
          employees = [
            { email: 'nakamura@digitalsolutions.co.jp', firstName: '中村', lastName: '雄一', role: 'MANAGER', position: '開発部長', phone: '090-7890-1234', prefecture: '大阪府', city: '大阪市北区', streetAddress: '梅田1-2-3' },
            { email: 'kobayashi@digitalsolutions.co.jp', firstName: '小林', lastName: '真理', role: 'MANAGER', position: 'スクラムマスター', phone: '090-8901-2345', prefecture: '大阪府', city: '大阪市中央区', streetAddress: '難波2-3-4' },
            { email: 'kato@digitalsolutions.co.jp', firstName: '加藤', lastName: '直樹', role: 'MEMBER', position: 'フルスタックエンジニア', phone: '090-9012-3456', prefecture: '兵庫県', city: '神戸市中央区', streetAddress: '三宮3-4-5' },
            { email: 'yoshida@digitalsolutions.co.jp', firstName: '吉田', lastName: '美穂', role: 'MEMBER', position: 'モバイルエンジニア', phone: '090-0123-4567', prefecture: '京都府', city: '京都市下京区', streetAddress: '四条通4-5-6' },
            { email: 'matsumoto@digitalsolutions.co.jp', firstName: '松本', lastName: '拓也', role: 'MEMBER', position: 'データエンジニア', phone: '090-1234-5679', prefecture: '奈良県', city: '奈良市', streetAddress: '奈良公園1-2-3' }
          ];
        } else { // イノベーティブテック
          employees = [
            { email: 'watanabe@innovativetech.com', firstName: '渡辺', lastName: '聡', role: 'MANAGER', position: 'CTO', phone: '090-2345-6780', prefecture: '愛知県', city: '名古屋市中区', streetAddress: '栄1-2-3' },
            { email: 'inoue@innovativetech.com', firstName: '井上', lastName: '由美', role: 'MANAGER', position: 'プロダクトマネージャー', phone: '090-3456-7891', prefecture: '愛知県', city: '名古屋市東区', streetAddress: '東区2-3-4' },
            { email: 'hayashi@innovativetech.com', firstName: '林', lastName: '和也', role: 'MEMBER', position: 'AIエンジニア', phone: '090-4567-8902', prefecture: '愛知県', city: '名古屋市西区', streetAddress: '西区3-4-5' },
            { email: 'shimizu@innovativetech.com', firstName: '清水', lastName: '恵子', role: 'MEMBER', position: 'DevOpsエンジニア', phone: '090-5678-9013', prefecture: '岐阜県', city: '岐阜市', streetAddress: '岐阜駅前1-2-3' },
            { email: 'yamazaki@innovativetech.com', firstName: '山崎', lastName: '大輔', role: 'MEMBER', position: 'セキュリティエンジニア', phone: '090-6789-0124', prefecture: '三重県', city: '四日市市', streetAddress: '四日市2-3-4' }
          ];
        }

        for (const empData of employees) {
          const empPassword = await bcrypt.hash('Employee123!', 10);
          await prisma.user.create({
            data: {
              email: empData.email,
              password: empPassword,
              firstName: empData.firstName,
              lastName: empData.lastName,
              role: empData.role,
              position: empData.position,
              isEmailVerified: true,
              isActive: true,
              companyId: company.id,
              phone: empData.phone,
              prefecture: empData.prefecture,
              city: empData.city,
              streetAddress: empData.streetAddress
            }
          });
        }
        console.log(`✓ ${employees.length}名の従業員を作成`);

        // === プロジェクトデータの作成 ===
        console.log(`📋 ${data.companyName} のプロジェクトを作成中...`);
        
        let projects = [];        if (index === 0) { // テックコーポレーション
          projects = [
            {
              name: 'AIチャットボット開発',
              description: '顧客サポート向けAIチャットボットシステムの開発プロジェクト',
              status: 'ACTIVE',
              startDate: new Date('2024-01-15'),
              endDate: new Date('2024-08-31')
            },
            {
              name: 'ECサイトリニューアル',
              description: '既存ECサイトのフルリニューアルプロジェクト',
              status: 'ON_HOLD',
              startDate: new Date('2024-03-01'),
              endDate: new Date('2024-12-31')
            }
          ];
        } else if (index === 1) { // デジタルソリューションズ
          projects = [
            {
              name: '在庫管理システム',
              description: 'クラウドベースの在庫管理システム開発',
              status: 'ACTIVE',
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-09-30')
            },
            {
              name: 'モバイルアプリ開発',
              description: '顧客向けサービスアプリの開発',
              status: 'COMPLETED',
              startDate: new Date('2023-10-01'),
              endDate: new Date('2024-01-31')
            }
          ];
        } else { // イノベーティブテック
          projects = [
            {
              name: 'IoTプラットフォーム',
              description: '産業用IoTデータ収集・分析プラットフォーム',
              status: 'ACTIVE',
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-10-31')
            },
            {
              name: 'ブロックチェーン決済',
              description: 'ブロックチェーン技術を使った決済システム',
              status: 'ON_HOLD',
              startDate: new Date('2024-06-01'),
              endDate: new Date('2025-03-31')
            }
          ];
        }

        for (const projData of projects) {
          await prisma.project.create({
            data: {
              ...projData,
              companyId: company.id
            }
          });
        }
        console.log(`✓ ${projects.length}個のプロジェクトを作成`);

      } else {
        console.log(`Company already exists: ${data.companyName}`);
      }
    }    console.log('\n🎉 統合データシード完了！');
    console.log('═══════════════════════════════════════');
    console.log('📊 データ作成サマリー:');
    console.log(`   ✓ グローバルスキル: ${globalSkills.length}個`);
    console.log(`   ✓ 管理者ユーザー: ${adminUsers.length}名`);
    console.log(`   ✓ 会社: ${companyData.length}社`);
    console.log(`   ✓ 会社管理者: ${companyData.length}名`);
    console.log(`   ✓ 従業員: 各社5-6名`);
    console.log(`   ✓ プロジェクト: 各社2個`);
    console.log('═══════════════════════════════════════');
    console.log('\n🔑 ログイン情報:');
    console.log('管理者アカウント:');
    adminUsers.forEach(admin => {
      console.log(`   📧 ${admin.email} / 🔐 ${admin.password}`);
    });
    console.log('\n会社管理者アカウント:');
    companyData.forEach(company => {
      console.log(`   📧 ${company.email} / 🔐 ${company.password}`);
    });
    console.log('\n従業員アカウント: Employee123! (共通パスワード)');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ データシード中にエラーが発生:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ シードプロセス失敗:', e);
    process.exit(1);
  });