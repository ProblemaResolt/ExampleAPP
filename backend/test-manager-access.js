const prisma = require('./src/lib/prisma');

async function testManagerAccess() {
  try {
    console.log('=== Testing MANAGER user access ===');
    
    // MANAGERユーザーの情報を取得
    const manager = await prisma.user.findUnique({
      where: { id: 'cmbfy7rra0005zbw0m6xn261e' },
      include: {
        company: true
      }
    });
    
    console.log('Manager user data:', JSON.stringify(manager, null, 2));
    
    if (manager && manager.companyId) {
      console.log('\n=== Fetching users for manager\'s company ===');
      
      // このマネージャーの会社のユーザーを取得
      const companyUsers = await prisma.user.findMany({
        where: {
          companyId: manager.companyId,
          isActive: true,
          role: { in: ['MANAGER', 'MEMBER'] }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          position: true,
          companyId: true
        }
      });
      
      console.log(`Found ${companyUsers.length} users in company ${manager.company.name}:`);
      console.log(JSON.stringify(companyUsers, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testManagerAccess();
