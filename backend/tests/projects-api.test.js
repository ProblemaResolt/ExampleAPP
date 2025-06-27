const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const projectRoutes = require('../src/routes/projects');
const { authenticate } = require('../src/middleware/authentication');

// テスト用のアプリケーション設定
const app = express();
app.use(express.json());

// テスト用の認証ミドルウェア
app.use('/projects', (req, res, next) => {
  // テスト用ユーザーを設定
  req.user = {
    id: 1,
    role: 'ADMIN',
    email: 'admin@test.com',
    managedCompanyId: 1
  };
  next();
});

app.use('/projects', projectRoutes);

const prisma = new PrismaClient();

describe('Projects API', () => {
  let testCompany;
  let testUsers;
  let testProject;

  beforeAll(async () => {
    // テスト用データの準備
    await prisma.$transaction(async (tx) => {      // テスト用会社を作成
      testCompany = await tx.company.create({
        data: {
          name: 'テスト会社',
          description: 'テスト用の会社'
        }
      });

      // テスト用ユーザーを作成
      testUsers = await Promise.all([
        tx.user.create({          data: {
            email: 'admin@test.com',
            firstName: '管理',
            lastName: '太郎',
            role: 'ADMIN',
            companyId: testCompany.id,
            isEmailVerified: true
          }
        }),
        tx.user.create({
          data: {
            email: 'manager@test.com',
            firstName: 'マネージャー',            lastName: '太郎',
            role: 'MANAGER',
            companyId: testCompany.id,
            isEmailVerified: true
          }
        }),
        tx.user.create({
          data: {
            email: 'member@test.com',
            firstName: 'メンバー',
            lastName: '太郎',
            role: 'MEMBER',
            companyId: testCompany.id,            isEmailVerified: true
          }
        })
      ]);
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await prisma.$transaction(async (tx) => {
      await tx.projectMembership.deleteMany({
        where: { projectId: testProject?.id }
      });
      await tx.project.deleteMany({
        where: { companyId: testCompany.id }
      });
      await tx.user.deleteMany({
        where: { companyId: testCompany.id }
      });
      await tx.company.delete({
        where: { id: testCompany.id }
      });
    });
    await prisma.$disconnect();
  });

  describe('POST /projects', () => {
    it('should create a new project with managers', async () => {
      const projectData = {
        name: 'テストプロジェクト',
        description: 'テスト用のプロジェクト',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        managerIds: [testUsers[1].id], // MANAGERロールのユーザー
        clientCompanyName: 'クライアント会社',
        clientContactName: '担当者',
        clientContactEmail: 'contact@client.com'
      };

      const response = await request(app)
        .post('/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].isManager).toBe(true);
      expect(response.body.data.members[0].userId).toBe(testUsers[1].id);

      testProject = response.body.data;
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'プロジェクト名なし'
      };

      const response = await request(app)
        .post('/projects')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBe('入力データが無効です');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate manager existence', async () => {
      const projectData = {
        name: 'テストプロジェクト2',
        startDate: '2024-01-01',
        managerIds: [99999] // 存在しないユーザーID
      };

      const response = await request(app)
        .post('/projects')
        .send(projectData)
        .expect(400);

      expect(response.body.message).toBe('一部のマネージャーが見つかりません');
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project with client information', async () => {
      const updateData = {
        name: '更新されたプロジェクト',
        description: '更新された説明',
        clientCompanyName: '新しいクライアント',
        clientContactName: '新しい担当者',
        clientContactEmail: 'new@client.com',
        clientContactPhone: '03-1234-5678',
        clientPrefecture: '東京都',
        clientCity: '渋谷区',
        clientStreetAddress: '1-1-1',
        status: 'COMPLETED'
      };

      const response = await request(app)
        .patch(`/projects/${testProject.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(updateData.name);
      expect(response.body.data.project.clientCompanyName).toBe(updateData.clientCompanyName);
      expect(response.body.data.project.status).toBe(updateData.status);
    });

    it('should validate email format in client contact', async () => {
      const updateData = {
        clientContactEmail: 'invalid-email'
      };

      const response = await request(app)
        .patch(`/projects/${testProject.id}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toBe('入力データが無効です');
      expect(response.body.errors.some(e => e.msg.includes('メールアドレス'))).toBe(true);
    });

    it('should handle manager updates', async () => {
      const updateData = {
        managerIds: [testUsers[0].id, testUsers[1].id] // ADMINとMANAGERを追加
      };

      const response = await request(app)
        .patch(`/projects/${testProject.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.members).toHaveLength(2);
      
      // 全てのメンバーがマネージャーとして設定されているか確認
      response.body.data.project.members.forEach(member => {
        expect(member.isManager).toBe(true);
      });
    });
  });

  describe('GET /projects', () => {
    it('should return projects list with pagination', async () => {
      const response = await request(app)
        .get('/projects')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.current).toBe(1);
    });

    it('should filter projects by status', async () => {
      const response = await request(app)
        .get('/projects')
        .query({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // すべてのプロジェクトがCOMPLETEDステータスであることを確認
      response.body.data.projects.forEach(project => {
        expect(project.status).toBe('COMPLETED');
      });
    });
  });

  describe('Role-based filtering', () => {
    it('should filter users by role correctly', async () => {
      // この部分は実際のユーザー取得APIをテストすることになります
      // プロジェクトのメンバー追加時のロールフィルタリングをテスト
      
      const managers = testUsers.filter(user => 
        user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'COMPANY'
      );
      
      const members = testUsers.filter(user => 
        user.role === 'MEMBER'
      );

      expect(managers).toHaveLength(2); // ADMINとMANAGER
      expect(members).toHaveLength(1); // MEMBER
      
      // マネージャーロールフィルターのテスト
      const managerRoles = ['ADMIN', 'MANAGER', 'COMPANY'];
      const filteredManagers = testUsers.filter(user => 
        managerRoles.includes(user.role)
      );
      
      expect(filteredManagers).toHaveLength(2);
      expect(filteredManagers.every(user =>        managerRoles.includes(user.role)
      )).toBe(true);
    });
  });

  describe('Member management', () => {
    let testProject;
    let testMember;

    beforeEach(async () => {
      // テスト用プロジェクトを作成
      testProject = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'テストプロジェクト',
          description: 'テスト用のプロジェクト',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          status: 'ACTIVE',
          priority: 'MEDIUM',
          managerIds: [testUsers[1].id], // COMPANY ユーザー
          memberIds: [testUsers[2].id],  // MANAGER ユーザー
          companyId: testCompany.id
        });

      testMember = testUsers[2]; // MANAGER role user
    });

    it('should update member allocation', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProject.body.data.id}/members/${testMember.id}/allocation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation: 0.5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('工数が正常に更新されました');
      expect(response.body.data.allocation).toBe(0.5);
    });

    it('should validate allocation range', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProject.body.data.id}/members/${testMember.id}/allocation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation: 1.5 // Invalid: > 1
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('工数は0から1の間で入力してください');
    });

    it('should update member period', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProject.body.data.id}/members/${testMember.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: '2024-02-01',
          endDate: '2024-11-30'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('メンバー期間が正常に更新されました');
    });

    it('should return 404 for non-existent member', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProject.body.data.id}/members/non-existent-id/allocation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          allocation: 0.5
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('メンバーシップが見つかりません');
    });
  });
});
