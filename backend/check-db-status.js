const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsersAndMemberships() {
  try {
    console.log('=== ユーザーとプロジェクトメンバーシップの状況 ===');
    
    const users = await prisma.user.findMany({
      include: {
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    users.forEach(user => {
      console.log(`\n${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      
      if (user.projectMemberships.length > 0) {
        console.log('  プロジェクト:');
        let totalAllocation = 0;
        user.projectMemberships.forEach(membership => {
          console.log(`    - ${membership.project.name}: ${(membership.allocation * 100).toFixed(1)}% (マネージャー: ${membership.isManager ? 'はい' : 'いいえ'})`);
          totalAllocation += membership.allocation;
        });
        console.log(`  総工数: ${(totalAllocation * 100).toFixed(1)}%`);
      } else {
        console.log('  プロジェクト: なし');
      }
    });

    console.log('\n=== プロジェクト一覧 ===');
    const projects = await prisma.project.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      }
    });

    projects.forEach(project => {
      console.log(`\n${project.name} (${project.status})`);
      console.log(`  ID: ${project.id}`);
      console.log(`  期間: ${project.startDate.toISOString().split('T')[0]} 〜 ${project.endDate.toISOString().split('T')[0]}`);
      if (project.members.length > 0) {
        console.log('  メンバー:');
        project.members.forEach(membership => {
          const user = membership.user;
          console.log(`    - ${user.firstName} ${user.lastName}: ${(membership.allocation * 100).toFixed(1)}% (マネージャー: ${membership.isManager ? 'はい' : 'いいえ'})`);
        });
      } else {
        console.log('  メンバー: なし');
      }
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersAndMemberships();
