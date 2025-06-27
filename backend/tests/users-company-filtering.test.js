const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const userRoutes = require('../src/routes/users');

// テスト用のアプリケーション設定
const app = express();
app.use(express.json());

const prisma = new PrismaClient();

describe('Users API Company Filtering', () => {
  let testCompany1, testCompany2;
  let testUsers;

  beforeAll(async () => {
    // テスト用データの準備
    await prisma.$transaction(async (tx) => {
      // 2つの会社を作成
      testCompany1 = await tx.company.create({
        data: { name: 'テスト会社1', description: 'テスト用の会社1', isActive: true }
      });

      testCompany2 = await tx.company.create({
        data: { name: 'テスト会社2', description: 'テスト用の会社2', isActive: true }
      });

      // 各会社にユーザーを作成
      testUsers = await Promise.all([
        tx.user.create({
          data: {
            email: 'manager1@company1.com',
            firstName: 'マネージャー1', lastName: '会社1',
            role: 'MANAGER', companyId: testCompany1.id,
            isActive: true, isEmailVerified: true
          }
        }),
        tx.user.create({
          data: {
            email: 'member1@company1.com',
            firstName: 'メンバー1', lastName: '会社1',
            role: 'MEMBER', companyId: testCompany1.id,
            isActive: true, isEmailVerified: true
          }
        }),
        tx.user.create({
          data: {
            email: 'manager2@company2.com',
            firstName: 'マネージャー2', lastName: '会社2',
            role: 'MANAGER', companyId: testCompany2.id,
            isActive: true, isEmailVerified: true
          }
        })
      ]);
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({
        where: { 
          OR: [
            { companyId: testCompany1.id },
            { companyId: testCompany2.id }
          ]
        }
      });
      await tx.company.deleteMany({
        where: { id: { in: [testCompany1.id, testCompany2.id] } }
      });
    });
    await prisma.$disconnect();
  });

  it('should only return users from same company for MANAGER role', async () => {
    // 会社1のマネージャーとしてテスト
    const testApp = express();
    testApp.use(express.json());
    
    testApp.use('/users', (req, res, next) => {
      req.user = {
        id: testUsers[0].id,
        role: 'MANAGER',
        companyId: testCompany1.id
      };
      next();
    });
    
    testApp.use('/users', userRoutes);

    const response = await request(testApp)
      .get('/users')
      .expect(200);

    expect(response.body.status).toBe('success');
    const users = response.body.data.users;
    
    // 会社1のユーザーのみが返されることを確認
    expect(users.length).toBe(2);
    users.forEach(user => {
      const matchedUser = testUsers.find(u => u.id === user.id);
      expect(matchedUser).toBeDefined();
      expect([testUsers[0].id, testUsers[1].id]).toContain(user.id);
    });

    // 会社2のユーザーが含まれていないことを確認
    expect(users.find(u => u.id === testUsers[2].id)).toBeUndefined();
  });
});
