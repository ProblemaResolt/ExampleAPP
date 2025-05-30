const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  try {
    // 初期管理者ユーザーの作成
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123'; // 本番環境では必ず変更してください

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      console.log('Creating initial admin user...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isEmailVerified: true,
          isActive: true
        }
      });
      console.log('Initial admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // 会社アカウントの作成
    const companyData = [
      {
        email: 'company1@example.com',
        password: 'Company123!',
        firstName: 'Company',
        lastName: 'One',
        companyName: '株式会社サンプル1',
        role: 'COMPANY'
      }
    ];

    for (const data of companyData) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        include: { managedCompany: true }
      });

      if (!existingUser) {
        console.log(`Creating company user: ${data.email}`);
        const hashedPassword = await bcrypt.hash(data.password, 10);
        
        // 会社を作成
        const company = await prisma.company.create({
          data: {
            name: data.companyName,
            description: `${data.companyName}の説明`,
            email: data.email
          }
        });

        // 会社管理者ユーザーを作成
        const user = await prisma.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            isEmailVerified: true,
            isActive: true,
            companyId: company.id
          }
        });

        // 会社管理者の関連付けを更新
        await prisma.company.update({
          where: { id: company.id },
          data: { managerId: user.id }
        });

        // ユーザーのmanagedCompanyIdを更新
        await prisma.user.update({
          where: { id: user.id },
          data: { managedCompanyId: company.id }
        });

        console.log(`Successfully created company user: ${data.email}`);

        // テストユーザーの作成
        const testUsers = [
          {
            email: 'manager1@example.com',
            password: 'Manager123!',
            firstName: 'Manager',
            lastName: 'One',
            role: 'MANAGER',
            position: 'プロジェクトマネージャー'
          },
          {
            email: 'member1@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'One',
            role: 'MEMBER',
            position: 'エンジニア'
          }
        ];

        for (const userData of testUsers) {
          const existingTestUser = await prisma.user.findUnique({
            where: { email: userData.email }
          });

          if (!existingTestUser) {
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
            console.log(`Created ${userData.role.toLowerCase()} user: ${userData.email}`);
          }
        }
      } else {
        console.log(`Company user already exists: ${data.email}`);
      }
    }
  } catch (error) {
    console.error('Error during migration:', error);
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