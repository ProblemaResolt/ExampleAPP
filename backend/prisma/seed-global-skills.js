const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedGlobalSkills() {
  console.log('🚀 グローバルスキルのシード開始...\n');

  const globalSkills = [
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

  try {
    let createdCount = 0;
    let skippedCount = 0;

    for (const skillData of globalSkills) {
      // 重複チェック
      const existingSkill = await prisma.globalSkill.findFirst({
        where: { name: skillData.name }
      });

      if (!existingSkill) {
        await prisma.globalSkill.create({
          data: skillData
        });
        console.log(`✅ 作成: ${skillData.name} (${skillData.category})`);
        createdCount++;
      } else {
        console.log(`⏭️  スキップ: ${skillData.name} (既存)`);
        skippedCount++;
      }
    }

    console.log(`\n📊 結果:`);
    console.log(`   - 新規作成: ${createdCount}件`);
    console.log(`   - スキップ: ${skippedCount}件`);
    console.log(`   - 総数: ${globalSkills.length}件`);

    // 最終的な統計を表示
    const totalGlobalSkills = await prisma.globalSkill.count();
    console.log(`\n📈 データベース内グローバルスキル総数: ${totalGlobalSkills}件`);

  } catch (error) {
    console.error('❌ グローバルスキルシードエラー:', error);
    throw error;
  }
}

async function main() {
  await seedGlobalSkills();
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
