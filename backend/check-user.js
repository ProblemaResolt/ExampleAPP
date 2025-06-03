const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'cmbfy7rra0005zbw0m6xn261e' },
      include: { 
        company: true,
        managedCompany: true 
      }
    });
    
    console.log('User data:', JSON.stringify(user, null, 2));
    
    if (user) {
      console.log('\nUser summary:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- companyId:', user.companyId);
      console.log('- managedCompanyId:', user.managedCompanyId);
      console.log('- Company name:', user.company?.name);
      console.log('- Managed company name:', user.managedCompany?.name);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
