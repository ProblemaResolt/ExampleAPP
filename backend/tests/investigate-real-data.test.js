const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

describe('Real Data Investigation', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should investigate 佐藤次郎 late arrival issue', async () => {
    // 佐藤次郎さんのデータを確認
    const user = await prisma.user.findFirst({
      where: {
        firstName: '佐藤',
        lastName: '次郎'
      }
    });

    expect(user).toBeTruthy();
    console.log('Found user:', user.firstName, user.lastName, user.id);

    // 個人勤務設定を確認
    const userSettings = await prisma.userWorkSettings.findUnique({
      where: { userId: user.id }
    });

    console.log('User work settings:', userSettings);

    // 最近の勤怠記録を確認
    const recentEntries = await prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        clockIn: { not: null },
        date: { gte: new Date('2025-06-01') }
      },
      orderBy: { date: 'desc' },
      take: 5
    });

    console.log(`Found ${recentEntries.length} recent entries`);

    for (const entry of recentEntries) {
      console.log(`\n--- Entry for ${entry.date.toISOString().split('T')[0]} ---`);
      
      // 効果的な勤務設定を取得
      const workSettings = await getEffectiveWorkSettings(
        user.id, 
        entry.date, 
        entry.date
      );

      console.log('Effective work settings:', {
        settingSource: workSettings.effective.settingSource,
        workStartTime: workSettings.effective.workStartTime,
        workEndTime: workSettings.effective.workEndTime,
        projectWorkSettingName: workSettings.effective.projectWorkSettingName
      });

      // 遅刻判定を実行
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      const clockInStr = entry.clockIn.toTimeString().slice(0, 5);
      
      console.log('Attendance:', {
        clockIn: clockInStr,
        expectedStart: workSettings.effective.workStartTime,
        isLate: lateCheck.isLate,
        lateMinutes: lateCheck.lateMinutes
      });

      // 問題のケースを特定
      if (workSettings.effective.workStartTime === '10:00' && 
          clockInStr <= '10:00' && 
          lateCheck.isLate) {
        console.log('❌ PROBLEM FOUND: Should not be late!');
        
        // 詳細なデバッグ情報
        console.log('Debug info:');
        console.log(`  String comparison: "${clockInStr}" > "${workSettings.effective.workStartTime}" = ${clockInStr > workSettings.effective.workStartTime}`);
        console.log(`  Clock in time object:`, entry.clockIn);
        console.log(`  toTimeString():`, entry.clockIn.toTimeString());
        console.log(`  slice(0, 5):`, entry.clockIn.toTimeString().slice(0, 5));
        
        fail(`10:00出勤で10:00開始時間なのに遅刻と判定されています`);
      }
    }
  });

  test('should check all project work settings with 10:00 start time', async () => {
    const projectSettings = await prisma.projectWorkSettings.findMany({
      where: {
        workStartTime: '10:00'
      },
      include: {
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        project: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${projectSettings.length} project settings with 10:00 start time`);

    for (const setting of projectSettings) {
      console.log(`\nProject: ${setting.project.name}`);
      console.log(`Setting: ${setting.name} (${setting.workStartTime}-${setting.workEndTime})`);
      console.log(`Active assignments: ${setting.userAssignments.length}`);

      for (const assignment of setting.userAssignments) {
        const user = assignment.user;
        console.log(`  User: ${user.firstName} ${user.lastName}`);

        // このユーザーの最近の勤怠記録で10:00付近の記録を確認
        const entries = await prisma.timeEntry.findMany({
          where: {
            userId: user.id,
            clockIn: { not: null },
            date: { gte: new Date('2025-06-01') }
          },
          orderBy: { date: 'desc' },
          take: 3
        });

        for (const entry of entries) {
          const workSettings = await getEffectiveWorkSettings(user.id, entry.date, entry.date);
          const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
          const clockInStr = entry.clockIn.toTimeString().slice(0, 5);

          console.log(`    ${entry.date.toISOString().split('T')[0]}: ${clockInStr} (Expected: ${workSettings.effective.workStartTime}) -> Late: ${lateCheck.isLate}`);

          // 問題があるケースを報告
          if (workSettings.effective.workStartTime === '10:00' && 
              clockInStr <= '10:00' && 
              lateCheck.isLate) {
            console.log(`    ❌ PROBLEM: ${clockInStr} incorrectly marked as late for 10:00 start`);
          }
        }
      }
    }
  });

  test('should test string comparison edge cases', () => {
    const testCases = [
      { time1: '09:59', time2: '10:00', expected: false },
      { time1: '10:00', time2: '10:00', expected: false },
      { time1: '10:01', time2: '10:00', expected: true },
      { time1: '10:30', time2: '10:00', expected: true },
      { time1: '08:00', time2: '10:00', expected: false },
      { time1: '11:00', time2: '10:00', expected: true }
    ];

    console.log('\nTesting string comparison logic:');
    testCases.forEach(({ time1, time2, expected }) => {
      const result = time1 > time2;
      const status = result === expected ? '✅' : '❌';
      console.log(`${status} "${time1}" > "${time2}" = ${result} (expected: ${expected})`);
      
      if (result !== expected) {
        fail(`String comparison failed: "${time1}" > "${time2}" should be ${expected}, got ${result}`);
      }
    });
  });
});
