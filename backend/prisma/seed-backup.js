const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  try {    // 初期管理者ユーザーの作成（複数）
    const adminUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User'
      },
      {
        email: 'admin2@example.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator'
      },
      {
        email: 'superadmin@example.com',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin'
      }
    ];

    for (const adminData of adminUsers) {
      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminData.email }
      });

      if (!existingAdmin) {
        console.log(`Creating admin user: ${adminData.email}`);
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
        console.log(`Admin user created successfully: ${adminData.email}`);
      } else {
        console.log(`Admin user already exists: ${adminData.email}`);
      }
    }    // 会社アカウントの作成（複数会社）
    const companyData = [
      {
        email: 'company1@example.com',
        password: 'Company123!',
        firstName: 'Company',
        lastName: 'One',
        companyName: '株式会社サンプル1',
        role: 'COMPANY'
      },
      {
        email: 'company2@example.com',
        password: 'Company123!',
        firstName: 'Company',
        lastName: 'Two',
        companyName: '株式会社テクノロジー',
        role: 'COMPANY'
      },
      {
        email: 'company3@example.com',
        password: 'Company123!',
        firstName: 'Company',
        lastName: 'Three',
        companyName: '合同会社イノベーション',
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

        console.log(`Successfully created company user: ${data.email}`);        // テストユーザーの作成（各ロール複数ユーザー）
        const testUsers = [
          // マネージャー（複数）
          {
            email: 'manager1@example.com',
            password: 'Manager123!',
            firstName: 'Manager',
            lastName: 'One',
            role: 'MANAGER',
            position: 'プロジェクトマネージャー'
          },
          {
            email: 'manager2@example.com',
            password: 'Manager123!',
            firstName: 'Manager',
            lastName: 'Two',
            role: 'MANAGER',
            position: 'テックリード'
          },
          {
            email: 'manager3@example.com',
            password: 'Manager123!',
            firstName: 'Manager',
            lastName: 'Three',
            role: 'MANAGER',
            position: 'スクラムマスター'
          },
          // メンバー（複数）
          {
            email: 'member1@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'One',
            role: 'MEMBER',
            position: 'フロントエンドエンジニア'
          },
          {
            email: 'member2@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'Two',
            role: 'MEMBER',
            position: 'バックエンドエンジニア'
          },
          {
            email: 'member3@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'Three',
            role: 'MEMBER',
            position: 'デザイナー'
          },
          {
            email: 'member4@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'Four',
            role: 'MEMBER',
            position: 'QAエンジニア'
          },
          {
            email: 'member5@example.com',
            password: 'Member123!',
            firstName: 'Member',
            lastName: 'Five',
            role: 'MEMBER',
            position: 'データベースエンジニア'
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