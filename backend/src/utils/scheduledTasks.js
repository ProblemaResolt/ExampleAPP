const cron = require('node-cron');
const prisma = require('../lib/prisma');

/**
 * 完了プロジェクトから期限切れメンバーを自動除外するスケジュールタスク
 * 毎日午前2時に実行
 */
const scheduleExpiredMemberRemoval = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 開始: 期限切れメンバーの自動除外処理');
    
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
        console.log('✅ 除外対象のプロジェクトはありません');
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

          console.log(`🚪 プロジェクト "${project.name}" から ${removedCount.count}名のメンバーを除外`);
          project.members.forEach(member => {
            console.log(`  - ${member.user.firstName} ${member.user.lastName}`);
          });
        }
      }

      console.log(`✅ 完了: ${expiredProjects.length}プロジェクトから合計${totalRemovedMembers}名のメンバーを自動除外しました`);

    } catch (error) {
      console.error('❌ 期限切れメンバー自動除外処理でエラーが発生しました:', error);
    }
  });

  console.log('⏰ スケジュールタスク設定完了: 期限切れメンバー自動除外 (毎日午前2時)');
};

module.exports = {
  scheduleExpiredMemberRemoval
};
