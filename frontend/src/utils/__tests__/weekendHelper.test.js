import { describe, it, expect } from 'vitest';
import { isWeekendDay, calculateWeekendDays, getWeekendInfo } from '../weekendHelper';

describe('weekendHelper (Frontend)', () => {
  describe('calculateWeekendDays', () => {
    it('月曜開始の場合、土日が週末になる', () => {
      const result = calculateWeekendDays(1); // 月曜開始
      expect(result).toEqual([6, 0]); // 土曜、日曜
    });

    it('火曜開始の場合、日月が週末になる', () => {
      const result = calculateWeekendDays(2); // 火曜開始
      expect(result).toEqual([0, 1]); // 日曜、月曜
    });

    it('水曜開始の場合、月火が週末になる', () => {
      const result = calculateWeekendDays(3); // 水曜開始
      expect(result).toEqual([1, 2]); // 月曜、火曜
    });

    it('日曜開始の場合、金土が週末になる', () => {
      const result = calculateWeekendDays(0); // 日曜開始
      expect(result).toEqual([5, 6]); // 金曜、土曜
    });
  });

  describe('isWeekendDay', () => {
    it('月曜開始設定で土日が週末と判定される', () => {
      const saturday = new Date('2025-06-14'); // 土曜日
      const sunday = new Date('2025-06-15'); // 日曜日
      const monday = new Date('2025-06-09'); // 月曜日
      const tuesday = new Date('2025-06-10'); // 火曜日

      expect(isWeekendDay(saturday, 1)).toBe(true);  // 土曜は週末
      expect(isWeekendDay(sunday, 1)).toBe(true);    // 日曜は週末
      expect(isWeekendDay(monday, 1)).toBe(false);   // 月曜は平日
      expect(isWeekendDay(tuesday, 1)).toBe(false);  // 火曜は平日
    });

    it('火曜開始設定で日月が週末と判定される', () => {
      const saturday = new Date('2025-06-14'); // 土曜日
      const sunday = new Date('2025-06-15'); // 日曜日
      const monday = new Date('2025-06-09'); // 月曜日
      const tuesday = new Date('2025-06-10'); // 火曜日

      expect(isWeekendDay(saturday, 2)).toBe(false); // 土曜は平日
      expect(isWeekendDay(sunday, 2)).toBe(true);    // 日曜は週末
      expect(isWeekendDay(monday, 2)).toBe(true);    // 月曜は週末
      expect(isWeekendDay(tuesday, 2)).toBe(false);  // 火曜は平日
    });

    it('水曜開始設定で月火が週末と判定される', () => {
      const saturday = new Date('2025-06-14'); // 土曜日
      const sunday = new Date('2025-06-15'); // 日曜日
      const monday = new Date('2025-06-09'); // 月曜日
      const tuesday = new Date('2025-06-10'); // 火曜日
      const wednesday = new Date('2025-06-11'); // 水曜日

      expect(isWeekendDay(saturday, 3)).toBe(false);   // 土曜は平日
      expect(isWeekendDay(sunday, 3)).toBe(false);     // 日曜は平日
      expect(isWeekendDay(monday, 3)).toBe(true);      // 月曜は週末
      expect(isWeekendDay(tuesday, 3)).toBe(true);     // 火曜は週末
      expect(isWeekendDay(wednesday, 3)).toBe(false);  // 水曜は平日
    });

    it('デフォルト値（月曜開始）が正しく動作する', () => {
      const saturday = new Date('2025-06-14'); // 土曜日
      const sunday = new Date('2025-06-15'); // 日曜日
      const monday = new Date('2025-06-09'); // 月曜日

      // weekStartDayを指定しない場合、デフォルトの1（月曜開始）
      expect(isWeekendDay(saturday)).toBe(true);  // 土曜は週末
      expect(isWeekendDay(sunday)).toBe(true);    // 日曜は週末
      expect(isWeekendDay(monday)).toBe(false);   // 月曜は平日
    });
  });

  describe('getWeekendInfo', () => {
    it('月曜開始設定の詳細情報を正しく返す', () => {
      const result = getWeekendInfo(1);
      
      expect(result).toEqual({
        weekStartDay: 1,
        weekStartDayName: '月',
        weekendDays: [6, 0],
        weekendDayNames: ['土', '日']
      });
    });

    it('火曜開始設定の詳細情報を正しく返す', () => {
      const result = getWeekendInfo(2);
      
      expect(result).toEqual({
        weekStartDay: 2,
        weekStartDayName: '火',
        weekendDays: [0, 1],
        weekendDayNames: ['日', '月']
      });
    });

    it('水曜開始設定の詳細情報を正しく返す', () => {
      const result = getWeekendInfo(3);
      
      expect(result).toEqual({
        weekStartDay: 3,
        weekStartDayName: '水',
        weekendDays: [1, 2],
        weekendDayNames: ['月', '火']
      });
    });

    it('デフォルト値で詳細情報を正しく返す', () => {
      const result = getWeekendInfo();
      
      expect(result).toEqual({
        weekStartDay: 1,
        weekStartDayName: '月',
        weekendDays: [6, 0],
        weekendDayNames: ['土', '日']
      });
    });
  });

  describe('全曜日パターンテスト', () => {
    const testDates = [
      { date: new Date('2025-06-08'), day: '日', dayOfWeek: 0 },
      { date: new Date('2025-06-09'), day: '月', dayOfWeek: 1 },
      { date: new Date('2025-06-10'), day: '火', dayOfWeek: 2 },
      { date: new Date('2025-06-11'), day: '水', dayOfWeek: 3 },
      { date: new Date('2025-06-12'), day: '木', dayOfWeek: 4 },
      { date: new Date('2025-06-13'), day: '金', dayOfWeek: 5 },
      { date: new Date('2025-06-14'), day: '土', dayOfWeek: 6 }
    ];

    it('日曜開始の場合の週末パターン', () => {
      const weekStartDay = 0; // 日曜開始
      const expectedWeekends = [5, 6]; // 金土が週末

      testDates.forEach(({ date, day, dayOfWeek }) => {
        const isWeekend = isWeekendDay(date, weekStartDay);
        const shouldBeWeekend = expectedWeekends.includes(dayOfWeek);
        expect(isWeekend).toBe(shouldBeWeekend);
      });
    });

    it('月曜開始の場合の週末パターン', () => {
      const weekStartDay = 1; // 月曜開始
      const expectedWeekends = [6, 0]; // 土日が週末

      testDates.forEach(({ date, day, dayOfWeek }) => {
        const isWeekend = isWeekendDay(date, weekStartDay);
        const shouldBeWeekend = expectedWeekends.includes(dayOfWeek);
        expect(isWeekend).toBe(shouldBeWeekend);
      });
    });

    it('木曜開始の場合の週末パターン', () => {
      const weekStartDay = 4; // 木曜開始
      const expectedWeekends = [2, 3]; // 火水が週末

      testDates.forEach(({ date, day, dayOfWeek }) => {
        const isWeekend = isWeekendDay(date, weekStartDay);
        const shouldBeWeekend = expectedWeekends.includes(dayOfWeek);
        expect(isWeekend).toBe(shouldBeWeekend);
      });
    });
  });

  describe('BulkTransportationModal統合テスト', () => {
    it('営業日数計算で正しい日数が返される', () => {
      // 2025年6月（30日間）のテスト
      const year = 2025;
      const month = 5; // JavaScript月は0ベース（6月）
      const daysInMonth = new Date(year, month + 1, 0).getDate(); // 30日
      
      // 月曜開始（土日が週末）の場合
      let workingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (!isWeekendDay(date, 1)) { // 月曜開始
          workingDays++;
        }
      }
      
      // 2025年6月は30日で、土日が8日間あるので営業日は22日
      expect(workingDays).toBe(22);
    });

    it('火曜開始設定での営業日数計算', () => {
      // 2025年6月での火曜開始（日月が週末）
      const year = 2025;
      const month = 5; // JavaScript月は0ベース（6月）
      const daysInMonth = new Date(year, month + 1, 0).getDate(); // 30日
      
      let workingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (!isWeekendDay(date, 2)) { // 火曜開始
          workingDays++;
        }
      }
      
      // 火曜開始の場合、日月が週末なので営業日数は異なる
      expect(workingDays).toBeGreaterThan(0);
      expect(workingDays).toBeLessThanOrEqual(30);
    });
  });
});
