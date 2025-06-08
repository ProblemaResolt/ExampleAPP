const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');
const { checkLateArrival, getEffectiveWorkSettings } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

describe('Late Arrival Calculation', () => {
  beforeAll(async () => {
    // テスト前にデータベース接続を確認
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('checkLateArrival function', () => {
    test('should not mark as late when clock in at 09:30 with 10:00 start time', () => {
      const clockInTime = new Date('2024-01-01T09:30:00');
      const workSettings = { 
        workStartTime: '10:00', 
        settingSource: 'test',
        projectName: null
      };

      const result = checkLateArrival(clockInTime, workSettings);

      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
      expect(result.expectedStartTime).toBe('10:00');
      expect(result.actualStartTime).toBe('09:30');
    });

    test('should not mark as late when clock in exactly at start time', () => {
      const clockInTime = new Date('2024-01-01T10:00:00');
      const workSettings = { 
        workStartTime: '10:00', 
        settingSource: 'test',
        projectName: null
      };

      const result = checkLateArrival(clockInTime, workSettings);

      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    test('should mark as late when clock in after start time', () => {
      const clockInTime = new Date('2024-01-01T10:01:00');
      const workSettings = { 
        workStartTime: '10:00', 
        settingSource: 'test',
        projectName: null
      };

      const result = checkLateArrival(clockInTime, workSettings);

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(1);
    });

    test('should handle 09:00 start time correctly', () => {
      const clockInTime = new Date('2024-01-01T09:30:00');
      const workSettings = { 
        workStartTime: '09:00', 
        settingSource: 'test',
        projectName: null
      };

      const result = checkLateArrival(clockInTime, workSettings);

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(30);
    });

    test('should handle string comparison edge cases', () => {
      // この問題で確認したいケース：文字列比較の問題
      const testCases = [
        { clockIn: '09:59', startTime: '10:00', expectedLate: false },
        { clockIn: '10:00', startTime: '10:00', expectedLate: false },
        { clockIn: '10:01', startTime: '10:00', expectedLate: true },
        { clockIn: '08:30', startTime: '09:00', expectedLate: false },
        { clockIn: '09:00', startTime: '09:00', expectedLate: false },
        { clockIn: '09:01', startTime: '09:00', expectedLate: true }
      ];

      testCases.forEach(({ clockIn, startTime, expectedLate }) => {
        const clockInTime = new Date(`2024-01-01T${clockIn}:00`);
        const workSettings = { 
          workStartTime: startTime, 
          settingSource: 'test',
          projectName: null
        };

        const result = checkLateArrival(clockInTime, workSettings);
        
        expect(result.isLate).toBe(expectedLate);
        
        // デバッグ情報をログ出力
        if (result.isLate !== expectedLate) {
          console.log(`FAILED: clockIn=${clockIn}, startTime=${startTime}, expected=${expectedLate}, actual=${result.isLate}`);
          console.log(`String comparison: "${clockIn}" > "${startTime}" = ${clockIn > startTime}`);
        }
      });
    });
  });

  describe('Real data investigation', () => {
    test('should investigate actual user work settings', async () => {
      // 佐藤次郎さんのデータを確認
      const user = await prisma.user.findFirst({
        where: {
          firstName: '佐藤',
          lastName: '次郎'
        }
      });

      if (user) {
        console.log('Found user:', user.firstName, user.lastName, user.id);

        // 個人勤務設定を確認
        const userSettings = await prisma.userWorkSettings.findUnique({
          where: { userId: user.id }
        });

        console.log('User work settings:', userSettings);

        // 最近の勤怠記録を確認
        const recentEntry = await prisma.timeEntry.findFirst({
          where: {
            userId: user.id,
            clockIn: { not: null }
          },
          orderBy: { date: 'desc' }
        });

        if (recentEntry) {
          console.log('Recent entry:', {
            date: recentEntry.date,
            clockIn: recentEntry.clockIn,
            clockInTime: recentEntry.clockIn.toTimeString().slice(0, 5)
          });

          // 効果的な勤務設定を取得
          const workSettings = await getEffectiveWorkSettings(
            user.id, 
            recentEntry.date, 
            recentEntry.date
          );

          console.log('Effective work settings:', workSettings.effective);

          // 遅刻判定を実行
          const lateCheck = checkLateArrival(recentEntry.clockIn, workSettings.effective);
          console.log('Late check result:', lateCheck);

          // 実際に10:00開始で10:00出勤の場合、遅刻ではないはず
          if (workSettings.effective.workStartTime === '10:00' && 
              recentEntry.clockIn.toTimeString().slice(0, 5) === '10:00') {
            expect(lateCheck.isLate).toBe(false);
          }
        }
      }
    });

    test('should check all users with 10:00 start time', async () => {
      // 10:00開始のプロジェクト設定を持つユーザーを確認
      const projectSettings = await prisma.projectWorkSettings.findMany({
        where: {
          workStartTime: '10:00'
        },
        include: {
          userAssignments: {
            where: { isActive: true },
            include: {
              user: true
            }
          },
          project: true
        }
      });

      console.log('Project settings with 10:00 start time:', projectSettings.length);

      for (const setting of projectSettings) {
        console.log(`Project: ${setting.project.name}, Setting: ${setting.name}`);
        
        for (const assignment of setting.userAssignments) {
          const user = assignment.user;
          console.log(`  User: ${user.firstName} ${user.lastName}`);

          // この人の最近の勤怠記録を確認
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

            console.log(`    ${entry.date.toISOString().split('T')[0]}: ${clockInStr} (Expected: ${workSettings.effective.workStartTime}, Late: ${lateCheck.isLate})`);

            // 10:00開始で10:00以前の出勤が遅刻と判定されている場合は問題
            if (workSettings.effective.workStartTime === '10:00' && 
                clockInStr <= '10:00' && 
                lateCheck.isLate) {
              console.log(`    ❌ PROBLEM: ${clockInStr} should not be late for 10:00 start time`);
            }
          }
        }
      }
    });
  });
});
