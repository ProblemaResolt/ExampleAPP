const cron = require('node-cron');
const prisma = require('../lib/prisma');

// 完了プロジェクトから期限切れメンバーを自動除外
const removeExpiredMembersFromCompletedProjects = async () => {
  try {
    console.log('🔄 完了プロジェクトの期限切れメンバー除外処理を開始...');
      // 完了状態で終了日を過ぎているプロジェクトを取得
    const expiredProjects = await prisma.project.findMany({
      where: {
        status: 'COMPLETED',
        endDate: {
          lt: new Date() // 現在時刻より前
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    let totalRemovedMembers = 0;
    let totalUpdatedManagers = 0;

    for (const project of expiredProjects) {
      // 一般メンバー（マネージャー以外）を除外
      const regularMembers = project.members.filter(m => !m.isManager);
      if (regularMembers.length > 0) {
        await prisma.projectMembership.deleteMany({
          where: {
            projectId: project.id,
            isManager: false
          }
        });

        console.log(`🚪 プロジェクト "${project.name}" から ${regularMembers.length}名のメンバーを除外:`);
        regularMembers.forEach(member => {
          console.log(`  - ${member.user.firstName} ${member.user.lastName}`);
        });

        totalRemovedMembers += regularMembers.length;
      }

      // マネージャーの工数を0に設定
      const managers = project.members.filter(m => m.isManager);
      if (managers.length > 0) {
        await prisma.projectMembership.updateMany({
          where: {
            projectId: project.id,
            isManager: true
          },
          data: {
            allocation: 0
          }
        });

        console.log(`📊 プロジェクト "${project.name}" のマネージャー工数を0に設定:`);
        managers.forEach(manager => {
          console.log(`  - ${manager.user.firstName} ${manager.user.lastName} (${Math.round(manager.allocation * 100)}% → 0%)`);
        });

        totalUpdatedManagers += managers.length;
      }
    }

    if (totalRemovedMembers > 0 || totalUpdatedManagers > 0) {
      console.log(`✅ 処理完了:`);
      if (totalRemovedMembers > 0) {
        console.log(`  - ${totalRemovedMembers}名のメンバーを除外`);
      }
      if (totalUpdatedManagers > 0) {
        console.log(`  - ${totalUpdatedManagers}名のマネージャーの工数を0に設定`);
      }
    } else {
      console.log('ℹ️ 処理対象のメンバーはありませんでした');
    }

  } catch (error) {
    console.error('❌ メンバー自動除外処理でエラーが発生:', error);
  }
};

// 毎日午前2時に実行
const startProjectTasks = () => {
  console.log('📅 プロジェクトタスクスケジューラーを開始...');
  
  // 毎日午前2時に実行 (cron: 分 時 日 月 曜日)
  cron.schedule('0 2 * * *', removeExpiredMembersFromCompletedProjects, {
    timezone: "Asia/Tokyo"
  });

  // 開発用: 毎分実行（コメントアウト）
  // cron.schedule('* * * * *', removeExpiredMembersFromCompletedProjects);

  console.log('✅ プロジェクトタスクスケジューラーが開始されました (毎日 2:00 AM)');
};

module.exports = {
  startProjectTasks,
  removeExpiredMembersFromCompletedProjects
};
