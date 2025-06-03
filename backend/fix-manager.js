const prisma = require('./src/lib/prisma');

async function checkAndFixUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'cmbfy7rra0005zbw0m6xn261e' },
      include: {
        company: true
      }
    });
    
    console.log('User data:', JSON.stringify(user, null, 2));
    
    if (user && !user.companyId) {
      console.log('\n=== FIXING MANAGER USER ===');
      
      // 同じメールドメインの会社を探す
      const domain = user.email.split('@')[1];
      console.log('Looking for company with domain:', domain);
      
      const company = await prisma.company.findFirst({
        where: {
          email: {
            endsWith: '@' + domain
          }
        }
      });
      
      if (company) {
        console.log('Found matching company:', company.name, 'ID:', company.id);
        
        // ユーザーを会社に関連付け
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { companyId: company.id },
          include: { company: true }
        });
        
        console.log('Updated user:', JSON.stringify(updatedUser, null, 2));
      } else {
        console.log('No matching company found for domain:', domain);
        
        // 利用可能な会社を表示
        const companies = await prisma.company.findMany({
          select: { id: true, name: true, email: true }
        });
        console.log('Available companies:', JSON.stringify(companies, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixUser();
