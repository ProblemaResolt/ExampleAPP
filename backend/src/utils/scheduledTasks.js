const cron = require('node-cron');
const prisma = require('../lib/prisma');

/**
 * 完了プロジェクトから期限切れメンバーを自動除外するスケジュールタスク
 * 毎日午前2時に実行
 */
const scheduleExpiredMemberRemoval = () => {
  cron.schedule('0 2 * * *', async () => {
    
    try {
      // 完了状態で終了日を過ぎたプロジェクトを取得
      const expiredProjects = await prisma.project.findMany({
        where: {
          status: 'COMPLETED',
          endDate: {
            lt: new Date()
          }
        },
        include: {
          members: {
            where: {
              isManager: false // マネージャーは除外しない
            },
            include: {
              user: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });

      if (expiredProjects.length === 0) {
        return;
      }

      let totalRemovedMembers = 0;

      for (const project of expiredProjects) {
        if (project.members.length > 0) {
          // メンバーを除外
          const removedCount = await prisma.projectMembership.deleteMany({
            where: {
              projectId: project.id,
              isManager: false
            }
          });

          totalRemovedMembers += removedCount.count;
        }
      }
    } catch (error) {
      console.error('❌ 期限切れメンバー自動除外処理でエラーが発生しました:', error);
    }
  });
};

module.exports = {
  scheduleExpiredMemberRemoval
};
