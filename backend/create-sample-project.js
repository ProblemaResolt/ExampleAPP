const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleProject() {
  try {
    // 会社とユーザーの確認
    const company = await prisma.company.findFirst({
      where: { name: '株式会社サンプル1' }
    });
    
    if (!company) {
      console.log('Company not found');
      return;
    }
    
    console.log('Company found:', company.id);
    
    // その会社のマネージャーを確認
    const manager = await prisma.user.findFirst({
      where: { 
        companyId: company.id,
        role: 'COMPANY'
      }
    });
    
    if (!manager) {
      console.log('Manager not found');
      return;
    }
    
    console.log('Manager found:', manager.id);
    
    // サンプルプロジェクトを作成
    const project = await prisma.project.create({
      data: {
        name: 'サンプルプロジェクト1',
        description: '工数管理のテスト用プロジェクトです',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
        status: 'ACTIVE',
        companyId: company.id,
        members: {
          create: {
            userId: manager.id,
            isManager: true,
            allocation: 1.0, // マネージャーは100%
            startDate: new Date()
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log('Project created:', project);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleProject();
