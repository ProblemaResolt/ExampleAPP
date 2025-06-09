const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function debugSpecificUser() {
  try {
    console.log('🔍 Debugging specific user late arrival calculation...\n');

    // 佐藤次郎さんのユーザーID
    const userId = 'cmbmiqzlc001t14518rym0gis';
    
    // 最近の勤怠記録を取得
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        clockIn: { not: null },
        date: {
          gte: new Date('2025-06-01'),
          lte: new Date('2025-06-30')
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    console.log(`📊 Found ${timeEntries.length} entries for user ${userId}`);

    for (const entry of timeEntries) {
      console.log(`\n📅 Date: ${entry.date.toISOString().split('T')[0]}`);
      console.log(`⏰ Clock In: ${entry.clockIn.toISOString()}`);
      
      // 効果的な勤務設定を取得
      const workSettings = await getEffectiveWorkSettings(userId, entry.date, entry.date);
      console.log(`⚙️  Work Settings:`, {
        source: workSettings.effective.settingSource,
        startTime: workSettings.effective.workStartTime,
        endTime: workSettings.effective.workEndTime,
        projectName: workSettings.effective.projectWorkSettingName
      });

      // 時刻文字列の確認
      const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
      const expectedStartTime = workSettings.effective.workStartTime;
      
      console.log(`🕐 Clock In Time String: "${clockInTimeStr}"`);
      console.log(`🕐 Expected Start Time: "${expectedStartTime}"`);
      console.log(`📋 String Comparison (${clockInTimeStr} > ${expectedStartTime}): ${clockInTimeStr > expectedStartTime}`);

      // 遅刻判定を実行
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      console.log(`🚨 Late Check Result:`, lateCheck);

      // 手動で時間比較を確認
      const [clockHour, clockMinute] = clockInTimeStr.split(':').map(Number);
      const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
      
      const clockMinutes = clockHour * 60 + clockMinute;
      const expectedMinutes = expectedHour * 60 + expectedMinute;
      
      console.log(`🔢 Manual Calculation:`);
      console.log(`   Clock In Minutes: ${clockMinutes} (${clockHour}:${clockMinute})`);
      console.log(`   Expected Minutes: ${expectedMinutes} (${expectedHour}:${expectedMinute})`);
      console.log(`   Difference: ${clockMinutes - expectedMinutes} minutes`);
      console.log(`   Should be late: ${clockMinutes > expectedMinutes}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSpecificUser();
