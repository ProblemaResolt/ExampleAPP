const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function investigateLateArrivalIssue() {
  try {
    console.log('�� Investigating late arrival calculation issue...');

    // 佐藤次郎さんのデータを確認
    const sato = await prisma.user.findFirst({
      where: {
        firstName: '佐藤',
        lastName: '次郎'
      }
    });

    if (!sato) {
      console.log('❌ User 佐藤次郎 not found');
      return;
    }

    console.log(`✅ Found user: ${sato.firstName} ${sato.lastName} (ID: ${sato.id})`);

    // 最近の勤怠記録を確認
    const recentEntries = await prisma.timeEntry.findMany({
      where: {
        userId: sato.id,
        clockIn: { not: null },
        date: {
          gte: new Date('2025-06-01')
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    console.log(`Recent attendance records (${recentEntries.length} entries):`);

    for (const entry of recentEntries) {
      const clockInStr = entry.clockIn.toTimeString().slice(0, 5);
      
      // 効果的な勤務設定を取得
      const workSettings = await getEffectiveWorkSettings(sato.id, entry.date, entry.date);
      
      // 遅刻判定を実行
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      
      console.log(`  ${entry.date.toISOString().split('T')[0]}: Clock in ${clockInStr}`);
      console.log(`    Expected start: ${workSettings.effective.workStartTime}`);
      console.log(`    Late? ${lateCheck.isLate} (${lateCheck.lateMinutes} min)`);
      
      // 問題のケースを特定
      if (workSettings.effective.workStartTime === '10:00' && 
          clockInStr <= '10:00' && 
          lateCheck.isLate) {
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateLateArrivalIssue();
