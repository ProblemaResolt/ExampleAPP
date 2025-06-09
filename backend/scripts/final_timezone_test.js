// Final comprehensive timezone test
const workSettings = require('../src/utils/workSettings');

console.log('=== 最終タイムゾーンテスト ===\n');

async function testTimezoneConversions() {
  try {
    // Test 1: 正常な出勤時刻（遅刻なし）
    console.log('Test 1: 正常な出勤（9:00 AM JST）');
    const normalClockIn = new Date('2024-01-15T00:00:00.000Z'); // UTC 00:00 = JST 09:00
    const settings1 = { startTime: '09:00', projectStartTime: '09:00' };
    const result1 = await workSettings.checkLateArrival(normalClockIn, settings1);
    console.log(`出勤時刻: UTC ${normalClockIn.toISOString()} (JST 09:00)`);
    console.log(`遅刻判定: ${result1.isLate ? '遅刻' : '正常'}`);
    console.log(`メッセージ: ${result1.message}`);
    console.log('');

    // Test 2: 1時間遅刻
    console.log('Test 2: 1時間遅刻（10:00 AM JST）');
    const lateClockIn = new Date('2024-01-15T01:00:00.000Z'); // UTC 01:00 = JST 10:00
    const settings2 = { startTime: '09:00', projectStartTime: '09:00' };
    const result2 = await workSettings.checkLateArrival(lateClockIn, settings2);
    console.log(`出勤時刻: UTC ${lateClockIn.toISOString()} (JST 10:00)`);
    console.log(`遅刻判定: ${result2.isLate ? '遅刻' : '正常'}`);
    console.log(`メッセージ: ${result2.message}`);
    console.log('');

    // Test 3: プロジェクト開始時刻が10:00の場合
    console.log('Test 3: プロジェクト開始時刻10:00、10:00出勤（正常）');
    const projectStartClockIn = new Date('2024-01-15T01:00:00.000Z'); // UTC 01:00 = JST 10:00
    const settings3 = { startTime: '10:00', projectStartTime: '10:00' };
    const result3 = await workSettings.checkLateArrival(projectStartClockIn, settings3);
    console.log(`出勤時刻: UTC ${projectStartClockIn.toISOString()} (JST 10:00)`);
    console.log(`プロジェクト開始時刻: ${settings3.projectStartTime}`);
    console.log(`遅刻判定: ${result3.isLate ? '遅刻' : '正常'}`);
    console.log(`メッセージ: ${result3.message}`);
    console.log('');

    // Test 4: 30分遅刻
    console.log('Test 4: 30分遅刻（9:30 AM JST）');
    const halfHourLate = new Date('2024-01-15T00:30:00.000Z'); // UTC 00:30 = JST 09:30
    const settings4 = { startTime: '09:00', projectStartTime: '09:00' };
    const result4 = await workSettings.checkLateArrival(halfHourLate, settings4);
    console.log(`出勤時刻: UTC ${halfHourLate.toISOString()} (JST 09:30)`);
    console.log(`遅刻判定: ${result4.isLate ? '遅刻' : '正常'}`);
    console.log(`メッセージ: ${result4.message}`);
    console.log('');

    // Test 5: 早朝出勤
    console.log('Test 5: 早朝出勤（8:00 AM JST）');
    const earlyClockIn = new Date('2024-01-14T23:00:00.000Z'); // UTC 23:00 (前日) = JST 08:00
    const settings5 = { startTime: '09:00', projectStartTime: '09:00' };
    const result5 = await workSettings.checkLateArrival(earlyClockIn, settings5);
    console.log(`出勤時刻: UTC ${earlyClockIn.toISOString()} (JST 08:00)`);
    console.log(`遅刻判定: ${result5.isLate ? '遅刻' : '正常'}`);
    console.log(`メッセージ: ${result5.message}`);
    console.log('');

    console.log('=== タイムゾーン変換確認 ===');
    console.log('UTC → JST 変換テスト:');
    const testTimes = [
      '2024-01-15T00:00:00.000Z', // UTC 00:00 = JST 09:00
      '2024-01-15T01:00:00.000Z', // UTC 01:00 = JST 10:00
      '2024-01-15T09:00:00.000Z', // UTC 09:00 = JST 18:00
      '2024-01-14T23:00:00.000Z'  // UTC 23:00 (前日) = JST 08:00
    ];

    testTimes.forEach(utcTime => {
      const date = new Date(utcTime);
      const jstTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      const jstTimeStr = jstTime.toISOString().slice(11, 16);
      console.log(`UTC: ${utcTime} → JST: ${jstTimeStr}`);
    });

  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

testTimezoneConversions();
