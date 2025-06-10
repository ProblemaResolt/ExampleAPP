const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database seed...');

    // ハッシュ化されたパスワードを準備
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // === システム管理者ユーザーの作成 ===
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'システム',
        lastName: '管理者',
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true,
        phone: '03-1234-5678',
        prefecture: '東京都',
        city: '千代田区',
        streetAddress: '大手町1-1-1 大手町ビル10F'
      }
    });

    console.log('Created admin user:', adminUser.email);

    // === テスト用会社の作成 ===
    const testCompany = await prisma.company.upsert({
      where: { name: 'テスト株式会社' },
      update: {},
      create: {
        name: 'テスト株式会社',
        description: 'システムテスト用の会社',
        address: '東京都渋谷区渋谷1-1-1',
        phone: '03-1234-5678',
        website: 'https://test-company.com',
        isActive: true
      }
    });

    console.log('Created test company:', testCompany.name);

    // === 会社管理者ユーザーの作成 ===
    const companyUser = await prisma.user.upsert({
      where: { email: 'company@example.com' },
      update: {},
      create: {
        email: 'company@example.com',
        password: hashedPassword,
        firstName: '会社',
        lastName: '管理者',
        role: 'COMPANY',
        isActive: true,
        isEmailVerified: true,
        managedCompanyId: testCompany.id
      }
    });

    console.log('Created company user:', companyUser.email);

    // === マネージャーユーザーの作成 ===
    const managerUser = await prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {},
      create: {
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'マネージャー',
        lastName: '太郎',
        role: 'MANAGER',
        isActive: true,
        isEmailVerified: true,
        companyId: testCompany.id
      }
    });

    console.log('Created manager user:', managerUser.email);

    // === 一般ユーザーの作成 ===
    const memberUser = await prisma.user.upsert({
      where: { email: 'member@example.com' },
      update: {},
      create: {
        email: 'member@example.com',
        password: hashedPassword,
        firstName: 'メンバー',
        lastName: '花子',
        role: 'MEMBER',
        isActive: true,
        isEmailVerified: true,
        companyId: testCompany.id
      }
    });

    console.log('Created member user:', memberUser.email);

    console.log('Database seeding completed successfully!');
    console.log('\n=== Login Credentials ===');
    console.log('Admin: admin@example.com / admin123');
    console.log('Company: company@example.com / admin123');
    console.log('Manager: manager@example.com / admin123');
    console.log('Member: member@example.com / admin123');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });