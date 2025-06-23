const cron = require('node-cron');
const prisma = require('../lib/prisma');

// 完了プロジェクトから期限切れメンバーを自動除外
const removeExpiredMembersFromCompletedProjects = async () => {
  try {
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
        totalUpdatedManagers += managers.length;
      }
    }
  } catch (error) {
    console.error('❌ メンバー自動除外処理でエラーが発生:', error);
  }
};

// 毎日午前2時に実行
const startProjectTasks = () => { 
  // 毎日午前2時に実行 (cron: 分 時 日 月 曜日)
  cron.schedule('0 2 * * *', removeExpiredMembersFromCompletedProjects, {
    timezone: "Asia/Tokyo"
  });

  // 開発用: 毎分実行（コメントアウト）
  // cron.schedule('* * * * *', removeExpiredMembersFromCompletedProjects);
};

module.exports = {
  startProjectTasks,
  removeExpiredMembersFromCompletedProjects
};
