const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== ユーザー一覧 ===');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        position: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n=== プロジェクトメンバーシップ ===');
    const memberships = await prisma.projectMembership.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        project: {
          select: {
            name: true,
            status: true
          }
        }
      }
    });
    console.log(JSON.stringify(memberships, null, 2));

    console.log('\n=== プロジェクト一覧 ===');
    const projects = await prisma.project.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      }
    });
    console.log(JSON.stringify(projects, null, 2));

    // 各ユーザーの総工数を計算
    console.log('\n=== ユーザー総工数 ===');
    for (const user of users) {
      const totalAllocation = await prisma.projectMembership.aggregate({
        where: {
          userId: user.id,
          project: {
            status: 'ACTIVE'
          },
          OR: [
            { endDate: null },
            { endDate: { gt: new Date() } }
          ]
        },
        _sum: {
          allocation: true
        }
      });
      
      console.log(`${user.firstName} ${user.lastName}: ${totalAllocation._sum.allocation || 0} (${Math.round((totalAllocation._sum.allocation || 0) * 100)}%)`);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
