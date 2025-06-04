const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 包括的なスキルセット
const skillCategories = {
  'プログラミング言語': [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'PHP',
    'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB', 'Perl', 'Shell Script'
  ],
  'フロントエンド': [
    'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'HTML5', 'CSS3', 'SCSS/SASS',
    'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Ant Design', 'Styled Components', 'jQuery'
  ],
  'バックエンド': [
    'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET Core',
    'Laravel', 'CodeIgniter', 'Symfony', 'Ruby on Rails', 'Gin', 'Echo', 'Fiber'
  ],
  'データベース': [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 'DynamoDB',
    'Cassandra', 'Neo4j', 'InfluxDB', 'CouchDB', 'MariaDB', 'Firebase Firestore'
  ],
  'クラウド・インフラ': [
    'AWS', 'Azure', 'Google Cloud Platform', 'Docker', 'Kubernetes', 'Terraform',
    'Ansible', 'Jenkins', 'GitLab CI/CD', 'GitHub Actions', 'CircleCI', 'Vercel', 'Netlify'
  ],
  'モバイル開発': [
    'React Native', 'Flutter', 'iOS (Swift)', 'Android (Kotlin/Java)', 'Xamarin',
    'Ionic', 'PhoneGap/Cordova', 'Unity', 'Unreal Engine'
  ],
  'データサイエンス・AI': [
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter', 'Apache Spark',
    'Keras', 'OpenCV', 'NLTK', 'Matplotlib', 'Seaborn', 'Tableau', 'Power BI'
  ],
  'デザイン・UI/UX': [
    'Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe After Effects',
    'Zeplin', 'InVision', 'Principle', 'Framer', 'Canva'
  ],
  'バージョン管理・協業': [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Subversion (SVN)', 'Mercurial',
    'Slack', 'Discord', 'Microsoft Teams', 'Zoom', 'Notion', 'Confluence', 'Jira'
  ],
  'テスト・品質管理': [
    'Jest', 'Cypress', 'Selenium', 'Puppeteer', 'Playwright', 'Mocha', 'Chai',
    'PyTest', 'JUnit', 'NUnit', 'SonarQube', 'ESLint', 'Prettier'
  ],
  '開発ツール・エディタ': [
    'Visual Studio Code', 'IntelliJ IDEA', 'Eclipse', 'Visual Studio', 'Sublime Text',
    'Atom', 'Vim', 'Emacs', 'WebStorm', 'PyCharm', 'Android Studio', 'Xcode'
  ],
  'その他の技術': [
    'GraphQL', 'REST API', 'WebSocket', 'gRPC', 'Microservices', 'Blockchain',
    'Ethereum', 'Solidity', 'Machine Learning', 'DevOps', 'Agile', 'Scrum'
  ]
};

async function restoreSkills() {
  try {
    console.log('🔍 現在のスキルデータを確認中...');
    
    // 現在のスキル数を確認
    const currentSkillsCount = await prisma.skill.count();
    console.log(`現在のスキル数: ${currentSkillsCount}`);

    // 全ての会社を取得
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`対象会社数: ${companies.length}`);
    
    if (companies.length === 0) {
      console.log('⚠️ 会社が見つかりません。まず会社を作成してください。');
      return;
    }

    let totalSkillsAdded = 0;

    // 各会社にスキルを追加
    for (const company of companies) {
      console.log(`\n📊 ${company.name} にスキルを追加中...`);
      
      // 既存のスキルを確認
      const existingSkills = await prisma.skill.findMany({
        where: { companyId: company.id },
        select: { name: true }
      });
      
      const existingSkillNames = new Set(existingSkills.map(skill => skill.name));
      console.log(`既存スキル数: ${existingSkillNames.size}`);

      let companySkillsAdded = 0;

      // カテゴリごとにスキルを追加
      for (const [category, skills] of Object.entries(skillCategories)) {
        console.log(`  📝 ${category} カテゴリのスキルを処理中...`);
        
        for (const skillName of skills) {
          // 既に存在しないスキルのみ追加
          if (!existingSkillNames.has(skillName)) {
            try {
              await prisma.skill.create({
                data: {
                  name: skillName,
                  companyId: company.id
                }
              });
              companySkillsAdded++;
              totalSkillsAdded++;
            } catch (error) {
              if (error.code === 'P2002') {
                // 重複エラーは無視
                console.log(`    ⚠️ スキル "${skillName}" は既に存在します`);
              } else {
                console.error(`    ❌ スキル "${skillName}" の追加に失敗:`, error.message);
              }
            }
          }
        }
      }
      
      console.log(`  ✅ ${company.name} に ${companySkillsAdded} 個のスキルを追加しました`);
    }

    console.log(`\n🎉 復旧完了！合計 ${totalSkillsAdded} 個のスキルを追加しました。`);

    // 最終結果を確認
    const finalSkillsCount = await prisma.skill.count();
    console.log(`\n📊 最終スキル数: ${finalSkillsCount}`);

    // 会社別スキル数の表示
    console.log('\n📋 会社別スキル数:');
    for (const company of companies) {
      const skillCount = await prisma.skill.count({
        where: { companyId: company.id }
      });
      console.log(`  - ${company.name}: ${skillCount} スキル`);
    }

  } catch (error) {
    console.error('❌ スキル復旧中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  restoreSkills();
}

module.exports = { restoreSkills };
