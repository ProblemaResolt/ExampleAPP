const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.subscription.deleteMany();
  await prisma.stripeCustomer.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 管理者ユーザーの作成
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true
    },
  });

  // 会社管理者ユーザーの作成
  const companyPassword = await bcrypt.hash('Company123!', 10);
  const company = await prisma.user.upsert({
    where: { email: 'company@example.com' },
    update: {},
    create: {
      email: 'company@example.com',
      password: companyPassword,
      firstName: 'Company',
      lastName: 'Manager',
      role: 'COMPANY',
      isActive: true,
      isEmailVerified: true,
      company: {
        create: {
          name: 'Example Company'
        }
      }
    },
  });

  console.log({ admin, company });

  // Create test users
  const memberPassword = await bcrypt.hash('member123', 10);
  const members = await Promise.all([
    prisma.user.create({
      data: {
        email: 'member1@example.com',
        password: memberPassword,
        firstName: 'Test',
        lastName: 'Member 1',
        role: 'MEMBER',
        isEmailVerified: true,
        isActive: true,
        company: {
          connect: { id: company.id }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'member2@example.com',
        password: memberPassword,
        firstName: 'Test',
        lastName: 'Member 2',
        role: 'MEMBER',
        isEmailVerified: true,
        isActive: true,
        company: {
          connect: { id: company.id }
        }
      }
    })
  ]);

  // Create test coupons
  const coupons = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'WELCOME10',
        discountAmount: 10,
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    }),
    prisma.coupon.create({
      data: {
        code: 'SUMMER20',
        discountAmount: 20,
        isActive: true,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      }
    })
  ]);

  // Create test subscription
  const subscription = await prisma.subscription.create({
    data: {
      plan: 'PRO',
      status: 'ACTIVE',
      stripeSubscriptionId: 'sub_test123',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      amount: 2000,
      company: {
        connect: { id: company.id }
      },
      coupon: {
        connect: { id: coupons[0].id }
      }
    }
  });

  // Create test Stripe customer
  await prisma.stripeCustomer.create({
    data: {
      stripeCustomerId: 'cus_test123',
      company: {
        connect: { id: company.id }
      }
    }
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 