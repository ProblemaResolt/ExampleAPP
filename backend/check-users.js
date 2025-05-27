const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // メンバー3_1の情報を取得
    const member = await prisma.user.findFirst({
      where: {
        firstName: { contains: 'メンバー3_1' }
      },
      include: {
        manager: true,
        company: true
      }
    });
    console.log('Member:', JSON.stringify(member, null, 2));

    // マネージャー1の情報を取得
    const manager = await prisma.user.findFirst({
      where: {
        firstName: { contains: 'マネージャー1' }
      },
      include: {
        managedMembers: true,
        company: true
      }
    });
    console.log('Manager:', JSON.stringify(manager, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 