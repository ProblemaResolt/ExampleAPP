const { calculateWeekendDays, isWeekendDay, batchCheckWeekendDays, getWeekendSettings } = require('../src/utils/weekendHelper');
const { getEffectiveWorkSettings } = require('../src/utils/workSettings');

// getEffectiveWorkSettingsをモック化
jest.mock('../src/utils/workSettings');

describe('weekendHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWeekendDays', () => {
    test('月曜開始の場合、土日が週末になる', () => {
      const result = calculateWeekendDays(1); // 月曜開始
      expect(result).toEqual([6, 0]); // 土曜、日曜
    });

    test('火曜開始の場合、日月が週末になる', () => {
      const result = calculateWeekendDays(2); // 火曜開始
      expect(result).toEqual([0, 1]); // 日曜、月曜
    });

    test('水曜開始の場合、月火が週末になる', () => {
      const result = calculateWeekendDays(3); // 水曜開始
      expect(result).toEqual([1, 2]); // 月曜、火曜
    });

    test('日曜開始の場合、金土が週末になる', () => {
      const result = calculateWeekendDays(0); // 日曜開始
      expect(result).toEqual([5, 6]); // 金曜、土曜
    });
  });

  describe('isWeekendDay', () => {
    test('プロジェクト設定がある場合、カスタム週末を使用', async () => {
      // モックデータ設定：火曜開始（日月が週末）
      getEffectiveWorkSettings.mockResolvedValue({
        projectWorkSettings: {
          weekStartDay: 2 // 火曜開始
        }
      });

      const testUserId = 'test-user-1';
      const monday = new Date('2025-06-09'); // 月曜日
      const tuesday = new Date('2025-06-10'); // 火曜日
      const sunday = new Date('2025-06-08'); // 日曜日

      // 月曜日は週末（火曜開始なので）
      const isMondayWeekend = await isWeekendDay(monday, testUserId);
      expect(isMondayWeekend).toBe(true);

      // 火曜日は平日
      const isTuesdayWeekend = await isWeekendDay(tuesday, testUserId);
      expect(isTuesdayWeekend).toBe(false);

      // 日曜日は週末
      const isSundayWeekend = await isWeekendDay(sunday, testUserId);
      expect(isSundayWeekend).toBe(true);
    });

    test('プロジェクト設定がない場合、デフォルト（土日）を使用', async () => {
      // プロジェクト設定なし
      getEffectiveWorkSettings.mockResolvedValue({
        effective: { settingSource: 'default' }
      });

      const testUserId = 'test-user-2';
      const saturday = new Date('2025-06-14'); // 土曜日
      const monday = new Date('2025-06-09'); // 月曜日
      const sunday = new Date('2025-06-15'); // 日曜日

      // 土曜日は週末
      const isSaturdayWeekend = await isWeekendDay(saturday, testUserId);
      expect(isSaturdayWeekend).toBe(true);

      // 月曜日は平日
      const isMondayWeekend = await isWeekendDay(monday, testUserId);
      expect(isMondayWeekend).toBe(false);

      // 日曜日は週末
      const isSundayWeekend = await isWeekendDay(sunday, testUserId);
      expect(isSundayWeekend).toBe(true);
    });

    test('エラーが発生した場合、デフォルト設定を使用', async () => {
      // エラーを発生させる
      getEffectiveWorkSettings.mockRejectedValue(new Error('Database error'));

      const testUserId = 'test-user-3';
      const saturday = new Date('2025-06-14'); // 土曜日
      const monday = new Date('2025-06-09'); // 月曜日

      // エラー時でも土曜日は週末として判定
      const isSaturdayWeekend = await isWeekendDay(saturday, testUserId);
      expect(isSaturdayWeekend).toBe(true);

      // エラー時でも月曜日は平日として判定
      const isMondayWeekend = await isWeekendDay(monday, testUserId);
      expect(isMondayWeekend).toBe(false);
    });
  });

  describe('batchCheckWeekendDays', () => {
    test('複数ユーザーの週末判定を一度に処理', async () => {
      // ユーザー1: 月曜開始（土日が週末）
      // ユーザー2: 水曜開始（月火が週末）
      getEffectiveWorkSettings
        .mockResolvedValueOnce({
          projectWorkSettings: { weekStartDay: 1 } // 月曜開始
        })
        .mockResolvedValueOnce({
          projectWorkSettings: { weekStartDay: 3 } // 水曜開始
        });

      const monday = new Date('2025-06-09'); // 月曜日
      const userIds = ['user1', 'user2'];

      const results = await batchCheckWeekendDays(monday, userIds);

      expect(results).toEqual({
        user1: false, // 月曜開始なので月曜は平日
        user2: true   // 水曜開始なので月曜は週末
      });
    });
  });

  describe('getWeekendSettings', () => {
    test('ユーザーの週末設定詳細を取得', async () => {
      getEffectiveWorkSettings.mockResolvedValue({
        projectWorkSettings: {
          weekStartDay: 2, // 火曜開始
          name: 'テストプロジェクト設定'
        },
        effective: {
          settingSource: 'project'
        }
      });

      const testUserId = 'test-user-4';
      const result = await getWeekendSettings(testUserId);

      expect(result).toEqual({
        userId: testUserId,
        weekStartDay: 2,
        weekStartDayName: '火',
        weekendDays: [0, 1], // 日曜、月曜
        weekendDayNames: ['日', '月'],
        projectSettings: {
          weekStartDay: 2,
          name: 'テストプロジェクト設定'
        },
        settingSource: 'project'
      });
    });

    test('設定取得でエラーが発生した場合、nullを返す', async () => {
      getEffectiveWorkSettings.mockRejectedValue(new Error('Database error'));

      const testUserId = 'test-user-5';
      const result = await getWeekendSettings(testUserId);

      expect(result).toBeNull();
    });
  });

  describe('実際の週パターンテスト', () => {
    test('月曜開始の一週間パターン', async () => {
      getEffectiveWorkSettings.mockResolvedValue({
        projectWorkSettings: { weekStartDay: 1 } // 月曜開始
      });

      const testUserId = 'test-user-6';
      const week = [
        { date: new Date('2025-06-08'), day: '日', expected: true },  // 週末
        { date: new Date('2025-06-09'), day: '月', expected: false }, // 平日
        { date: new Date('2025-06-10'), day: '火', expected: false }, // 平日
        { date: new Date('2025-06-11'), day: '水', expected: false }, // 平日
        { date: new Date('2025-06-12'), day: '木', expected: false }, // 平日
        { date: new Date('2025-06-13'), day: '金', expected: false }, // 平日
        { date: new Date('2025-06-14'), day: '土', expected: true }   // 週末
      ];

      for (const { date, day, expected } of week) {
        const result = await isWeekendDay(date, testUserId);
        expect(result).toBe(expected);
      }
    });

    test('水曜開始の一週間パターン', async () => {
      getEffectiveWorkSettings.mockResolvedValue({
        projectWorkSettings: { weekStartDay: 3 } // 水曜開始
      });

      const testUserId = 'test-user-7';
      const week = [
        { date: new Date('2025-06-08'), day: '日', expected: false }, // 平日
        { date: new Date('2025-06-09'), day: '月', expected: true },  // 週末
        { date: new Date('2025-06-10'), day: '火', expected: true },  // 週末
        { date: new Date('2025-06-11'), day: '水', expected: false }, // 平日
        { date: new Date('2025-06-12'), day: '木', expected: false }, // 平日
        { date: new Date('2025-06-13'), day: '金', expected: false }, // 平日
        { date: new Date('2025-06-14'), day: '土', expected: false }  // 平日
      ];

      for (const { date, day, expected } of week) {
        const result = await isWeekendDay(date, testUserId);
        expect(result).toBe(expected);
      }
    });
  });
});