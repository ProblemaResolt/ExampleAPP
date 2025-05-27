const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 株式会社テスト1の情報を取得
    const company = await prisma.company.findFirst({
      where: {
        name: '株式会社テスト1'
      },
      include: {
        users: {
          include: {
            manager: true,
            managedMembers: true
          }
        }
      }
    });

    if (!company) {
      console.log('会社が見つかりません');
      return;
    }

    const result = {
      company: {
        id: company.id,
        name: company.name
      },
      managers: company.users
        .filter(user => user.role === 'MANAGER')
        .map(manager => ({
          id: manager.id,
          name: `${manager.firstName} ${manager.lastName}`,
          email: manager.email,
          managedMembers: manager.managedMembers.map(member => ({
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email
          }))
        })),
      members: company.users
        .filter(user => user.role === 'MEMBER')
        .map(member => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          manager: member.manager ? {
            id: member.manager.id,
            name: `${member.manager.firstName} ${member.manager.lastName}`
          } : null
        }))
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 