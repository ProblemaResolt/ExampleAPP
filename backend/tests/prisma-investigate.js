const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function investigateLateArrivalIssue() {
  try {
    console.log('🔍 Investigating late arrival calculation issue...\n');

    // 1. 佐藤次郎さんのデータを確認
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

    // 2. 個人勤務設定を確認
    const userSettings = await prisma.userWorkSettings.findUnique({
      where: { userId: sato.id }
    });

    console.log('\n📋 Personal work settings:');
    if (userSettings) {
      console.log(`  Work time: ${userSettings.workStartTime} - ${userSettings.workEndTime}`);
      console.log(`  Work hours: ${userSettings.workHours}h, Break: ${userSettings.breakTime}min`);
    } else {
      console.log('  No personal settings found');
    }

    // 3. プロジェクト勤務設定への割り当てを確認
    const projectAssignments = await prisma.userProjectWorkSettings.findMany({
      where: {
        userId: sato.id,
        isActive: true
      },
      include: {
        projectWorkSettings: {
          include: {
            project: true
          }
        }
      }
    });

    console.log('\n📊 Project work settings assignments:');
    projectAssignments.forEach(assignment => {
      const setting = assignment.projectWorkSettings;
      console.log(`  Project: ${setting.project.name}`);
      console.log(`  Setting: ${setting.name}`);
      console.log(`  Work time: ${setting.workStartTime} - ${setting.workEndTime}`);
      console.log(`  Break: ${setting.breakDuration}min`);
      console.log(`  Active: ${assignment.isActive}`);
      console.log('');
    });

    // 4. 最近の勤怠記録を確認
    const recentEntries = await prisma.timeEntry.findMany({
      where: {
        userId: sato.id,
        clockIn: { not: null },
        date: {
          gte: new Date('2025-06-01'),
          lte: new Date('2025-06-30')
        }
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    console.log(`\n⏰ Recent attendance records (${recentEntries.length} entries):`);

    for (const entry of recentEntries) {
      const clockInStr = entry.clockIn.toTimeString().slice(0, 5);
      
      // 効果的な勤務設定を取得
      const workSettings = await getEffectiveWorkSettings(sato.id, entry.date, entry.date);
      
      // 遅刻判定を実行
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      
      console.log(`  ${entry.date.toISOString().split('T')[0]}: Clock in ${clockInStr}`);
      console.log(`    Expected start: ${workSettings.effective.workStartTime}`);
      console.log(`    Settings source: ${workSettings.effective.settingSource}`);
      console.log(`    Late? ${lateCheck.isLate} (${lateCheck.lateMinutes} min)`);
      
      // 10:00開始で10:00以前の出勤が遅刻と判定されている場合
      if (workSettings.effective.workStartTime === '10:00' && 
          clockInStr <= '10:00' && 
          lateCheck.isLate) {
        console.log(`    ❌ PROBLEM: ${clockInStr} should NOT be late for 10:00 start time!`);
      }
      
      console.log('');
    }

    // 5. 文字列比較のテスト
    console.log('\n🧪 String comparison tests:');
    const testCases = [
      { clockIn: '09:30', start: '10:00' },
      { clockIn: '09:59', start: '10:00' },
      { clockIn: '10:00', start: '10:00' },
      { clockIn: '10:01', start: '10:00' },
      { clockIn: '10:30', start: '10:00' }
    ];

    testCases.forEach(test => {
      const isLate = test.clockIn > test.start;
      console.log(`  "${test.clockIn}" > "${test.start}" = ${isLate}`);
    });

    // 6. 月次統計での遅刻カウントを確認
    console.log('\n📈 Checking monthly late count calculation...');
    
    const year = 2025;
    const month = 6;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const monthlyEntries = await prisma.timeEntry.findMany({
      where: {
        userId: sato.id,
        clockIn: { not: null },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      orderBy: { date: 'asc' }
    });

    let manualLateCount = 0;
    
    for (const entry of monthlyEntries) {
      const workSettings = await getEffectiveWorkSettings(sato.id, entry.date, entry.date);
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      
      if (lateCheck.isLate) {
        manualLateCount++;
        const clockInStr = entry.clockIn.toTimeString().slice(0, 5);
        console.log(`  Late entry: ${entry.date.toISOString().split('T')[0]} ${clockInStr} (Expected: ${workSettings.effective.workStartTime})`);
      }
    }

    console.log(`\nTotal manual late count for ${year}-${month}: ${manualLateCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateLateArrivalIssue();
