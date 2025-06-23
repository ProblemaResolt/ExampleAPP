const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('プロジェクト作成API', () => {
  let authToken;
  let testUser;
  let testCompany;

  beforeAll(async () => {
    // テスト用会社作成
    testCompany = await prisma.company.create({
      data: {
        name: 'テスト会社',
        email: 'test@company.com',
        subscriptionStatus: 'ACTIVE'
      }
    });

    // テスト用ユーザー作成
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'テスト',
        lastName: 'ユーザー',
        role: 'COMPANY',
        companyId: testCompany.id,
        managedCompanyId: testCompany.id,
        isActive: true,
        isEmailVerified: true
      }
    });

    // JWTトークン生成
    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // マネージャーユーザー作成
    await prisma.user.create({
      data: {
        email: 'manager@example.com',
        firstName: 'マネージャー',
        lastName: 'テスト',
        role: 'MANAGER',
        companyId: testCompany.id,
        isActive: true,
        isEmailVerified: true
      }
    });
  });

  afterAll(async () => {
    // クリーンアップ
    await prisma.user.deleteMany({
      where: { companyId: testCompany.id }
    });
    await prisma.company.delete({
      where: { id: testCompany.id }
    });
    await prisma.$disconnect();
  });

  test('有効なデータでプロジェクト作成', async () => {
    const projectData = {
      name: 'テストプロジェクト',
      description: 'テスト用プロジェクト',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'PLANNED',
      priority: 'MEDIUM',
      managerIds: [],
      memberIds: []
    };

    console.log('送信データ:', projectData);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(projectData);

    console.log('レスポンス:', response.status, response.body);

    expect(response.status).toBe(201);
  });

  test('名前なしでプロジェクト作成（エラー）', async () => {
    const projectData = {
      description: 'テスト用プロジェクト',
      startDate: '2025-01-01'
    };

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(projectData);

    console.log('バリデーションエラー:', response.status, response.body);

    expect(response.status).toBe(400);
  });
});
