const prisma = require('./src/lib/prisma');

async function checkAllUsers() {
  try {
    console.log('Connecting to database...');
    
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        role: true, 
        companyId: true,
        firstName: true,
        lastName: true
      },
      orderBy: { role: 'asc' }
    });
    
    console.log('\n=== ALL USERS ===');
    users.forEach(user => {
      console.log(`${user.role}: ${user.email} (${user.firstName} ${user.lastName}) - Company: ${user.companyId || 'None'}`);
    });
    
    console.log('\n=== USER COUNT BY ROLE ===');
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`${role}: ${count} users`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();
