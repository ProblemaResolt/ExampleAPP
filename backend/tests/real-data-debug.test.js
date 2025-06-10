const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

describe('Late Arrival Real Data Investigation', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should investigate specific user late arrival calculation', async () => {
    // 佐藤次郎さんのデータを確認
    const user = await prisma.user.findFirst({
      where: {
        firstName: '佐藤',
        lastName: '次郎'
      }
    });

    if (!user) {
      return;
    }


    // 最近の勤怠記録を確認
    const recentEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        clockIn: { not: null },
        date: { gte: new Date('2025-06-01') }
      },
      orderBy: { date: 'desc' }
    });

    if (!recentEntry) {
      return;
    }

      date: recentEntry.date.toISOString().split('T')[0],
      clockIn: recentEntry.clockIn,
      clockInTime: recentEntry.clockIn.toTimeString().slice(0, 5)
    });

    // 効果的な勤務設定を取得
    const workSettings = await getEffectiveWorkSettings(
      user.id, 
      recentEntry.date, 
      recentEntry.date
    );

      settingSource: workSettings.effective.settingSource,
      workStartTime: workSettings.effective.workStartTime,
      workEndTime: workSettings.effective.workEndTime
    });

    // 遅刻判定を実行
    const lateCheck = checkLateArrival(recentEntry.clockIn, workSettings.effective);

    // 10:00開始で10:00出勤の場合の問題を確認
    const clockInStr = recentEntry.clockIn.toTimeString().slice(0, 5);
    if (workSettings.effective.workStartTime === '10:00' && clockInStr === '10:00') {
      expect(lateCheck.isLate).toBe(false);
    }
  });

  test('should test string comparison behavior', () => {
    
    const comparisons = [
      ['09:59', '10:00'],
      ['10:00', '10:00'], 
      ['10:01', '10:00'],
      ['10:30', '10:00']
    ];

    comparisons.forEach(([time1, time2]) => {
      const result = time1 > time2;
    });

    // 重要なケース：10:00 = 10:00 は false であることを確認
    expect('10:00' > '10:00').toBe(false);
    expect('09:59' > '10:00').toBe(false);
    expect('10:01' > '10:00').toBe(true);
  });
});
