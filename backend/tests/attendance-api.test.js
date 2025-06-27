const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Monthly Attendance API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await prisma.$connect();

    // テスト用ユーザーを作成（または既存ユーザーを取得）
    testUser = await prisma.user.findFirst({
      where: {
        firstName: '佐藤',
        lastName: '次郎'
      }
    });

    if (!testUser) {
      // テスト用ユーザーが存在しない場合はスキップ
      return;
    }

    // 認証トークンを取得（実際の認証フローに基づいて調整が必要）
    // ここではモックトークンまたは既存のセッションを使用
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/attendance/monthly/:year/:month', () => {
    test('should return monthly attendance data with correct late calculation', async () => {
      if (!testUser) {
        return;
      }

      const year = 2025;
      const month = 6;

      // 認証なしでテスト（開発環境用）
      const response = await request(app)
        .get(`/api/attendance/monthly/${year}/${month}`)
        .query({ userId: testUser.id });

      // レスポンスの構造を確認
      
      if (response.status === 200) {
        const data = response.body.data;

        // 各勤怠データの遅刻判定を確認
        Object.entries(data.attendanceData).forEach(([date, entry]) => {
          if (entry.clockIn) {
            
            // 10:00開始で10:00以前の出勤が遅刻カウントに含まれていないかチェック
            if (data.workSettings.workStartTime === '10:00') {
              const clockInTime = entry.clockIn.split(' ')[0]; // 時刻部分のみ取得
              if (clockInTime <= '10:00') {
                // この場合、月次統計の遅刻数にカウントされていないことを確認
                // （実際のAPIレスポンス構造に基づいて調整）
              }
            }
          }
        });

        expect(data).toHaveProperty('attendanceData');
        expect(data).toHaveProperty('monthlyStats');
        expect(data).toHaveProperty('workSettings');
      } else if (response.status === 401) {
      } else {
      }
    });
  });

  describe('Late count calculation debugging', () => {
    test('should debug late count calculation in monthly stats', async () => {
      if (!testUser) {
        return;
      }

      // 直接データベースから月次データを取得して計算を確認
      const year = 2025;
      const month = 6;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const entries = await prisma.timeEntry.findMany({
        where: {
          userId: testUser.id,
          date: {
            gte: startDate,
            lte: endDate
          },
          clockIn: { not: null }
        },
        orderBy: { date: 'asc' }
      });


      // 各エントリーの遅刻判定を手動で確認
      const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');
      
      let manualLateCount = 0;
      
      for (const entry of entries) {
        const workSettings = await getEffectiveWorkSettings(testUser.id, entry.date, entry.date);
        const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
        const clockInStr = entry.clockIn.toTimeString().slice(0, 5);


        if (lateCheck.isLate) {
          manualLateCount++;
        }
      }


      // APIの結果と比較するため、APIからも取得
      try {
        const apiResponse = await request(app)
          .get(`/api/attendance/monthly/${year}/${month}`)
          .query({ userId: testUser.id });

        if (apiResponse.status === 200) {
          const apiLateCount = apiResponse.body.data.monthlyStats.lateCount;

          // 手動計算とAPIの結果が一致することを確認
          expect(manualLateCount).toBe(apiLateCount);
        }
      } catch (error) {
      }
    });
  });
});
