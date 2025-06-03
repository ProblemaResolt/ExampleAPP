const prisma = require('./src/lib/prisma');

async function testMemberAccess() {
  try {
    const memberUser = await prisma.user.findFirst({
      where: { role: 'MEMBER' },
      select: { id: true, email: true, role: true, companyId: true }
    });
    
    console.log('Found MEMBER user:', JSON.stringify(memberUser, null, 2));
    
    if (memberUser) {
      console.log('\nThis MEMBER user should NOT be able to access /api/users endpoint');
      console.log('Frontend should prevent this call entirely');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemberAccess();
