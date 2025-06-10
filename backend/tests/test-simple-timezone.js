// 環境変数を直接設定
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/app?schema=public";

const { checkLateArrival } = require('./src/utils/workSettings');


// テストケース: UTC 10:00の出勤時刻（データベースに保存されている形式）
const clockInTimeUTC = new Date('2025-06-02T10:00:00.000Z');

// 新しい修正されたJST変換
const jstTime = new Date(clockInTimeUTC.getTime() + (9 * 60 * 60 * 1000)); 
const clockInTimeStr = jstTime.toISOString().slice(11, 16);

// 勤務設定: 10:00開始
const workSettings = {
  workStartTime: '10:00',
  settingSource: 'test',
  projectName: 'Test Project'
};

// 遅刻判定テスト
const result = checkLateArrival(clockInTimeUTC, workSettings);

// 複数のテストケース

const testCases = [
  { time: '2025-06-02T09:59:00.000Z', description: '9:59 UTC (should be 09:59 JST - NOT late)' },
  { time: '2025-06-02T10:00:00.000Z', description: '10:00 UTC (should be 10:00 JST - NOT late)' },
  { time: '2025-06-02T10:01:00.000Z', description: '10:01 UTC (should be 10:01 JST - LATE by 1 minute)' },
  { time: '2025-06-02T01:00:00.000Z', description: '1:00 UTC (should be 01:00 JST - NOT late)' }
];

testCases.forEach(testCase => {
  const clockIn = new Date(testCase.time);
  const result = checkLateArrival(clockIn, workSettings);
});
