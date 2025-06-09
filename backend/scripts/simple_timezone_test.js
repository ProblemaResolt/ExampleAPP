// Simplified timezone test without database
const path = require('path');

// Mock the database connection to avoid Prisma errors
global.mockPrisma = true;

// Import the workSettings utility
const workSettings = require('../src/utils/workSettings');

console.log('=== 簡易タイムゾーンテスト ===\n');

async function testSimpleTimezone() {
  try {
    console.log('タイムゾーン変換テスト:');
      // Test timezone conversion logic directly
    // プロジェクト開始時刻は10:00に設定されている
    const testCases = [
      {
        description: '正常出勤: UTC 01:00 → JST 10:00 (プロジェクト開始時刻)',
        utcTime: '2024-01-15T01:00:00.000Z',
        startTime: '10:00'
      },
      {
        description: '1時間遅刻: UTC 02:00 → JST 11:00', 
        utcTime: '2024-01-15T02:00:00.000Z',
        startTime: '10:00'
      },
      {
        description: '30分遅刻: UTC 01:30 → JST 10:30',
        utcTime: '2024-01-15T01:30:00.000Z', 
        startTime: '10:00'
      },
      {
        description: '早朝出勤: UTC 00:00 → JST 09:00 (1時間早い)',
        utcTime: '2024-01-15T00:00:00.000Z',
        startTime: '10:00'
      }
    ];

    testCases.forEach(testCase => {
      console.log(`\n${testCase.description}`);
      
      const clockInTime = new Date(testCase.utcTime);
      console.log(`UTC時刻: ${clockInTime.toISOString()}`);
      
      // Simulate the JST conversion logic from workSettings
      const jstTime = new Date(clockInTime.getTime() + (9 * 60 * 60 * 1000));
      const clockInTimeStr = jstTime.toISOString().slice(11, 16);
      console.log(`JST時刻: ${clockInTimeStr}`);
      
      // Compare with start time
      const startTime = testCase.startTime;
      console.log(`開始時刻: ${startTime}`);
      
      const isLate = clockInTimeStr > startTime;
      console.log(`遅刻判定: ${isLate ? '遅刻' : '正常'}`);
      
      if (isLate) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [clockHours, clockMinutes] = clockInTimeStr.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const clockTotalMinutes = clockHours * 60 + clockMinutes;
        const lateMinutes = clockTotalMinutes - startTotalMinutes;
        
        console.log(`遅刻時間: ${lateMinutes}分`);
      }
    });

    console.log('\n=== フロントエンド形式変換テスト ===');
    
    // Test frontend time formatting
    const frontendTestCases = [
      '2024-01-15T00:00:00.000Z', // UTC 00:00 → JST 09:00
      '2024-01-15T01:00:00.000Z', // UTC 01:00 → JST 10:00  
      '2024-01-15T09:00:00.000Z'  // UTC 09:00 → JST 18:00
    ];

    console.log('\nUTC → JST 表示用変換:');
    frontendTestCases.forEach(utcTime => {
      const date = new Date(utcTime);
      
      // Display format (should show JST time)
      const jstDisplayTime = date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit', 
        hour12: false,
        timeZone: 'Asia/Tokyo'
      });
      
      // Edit format (should return JST time in HH:MM format)
      const jstEditTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      const editFormat = `${jstEditTime.getUTCHours().toString().padStart(2, '0')}:${jstEditTime.getUTCMinutes().toString().padStart(2, '0')}`;
      
      console.log(`UTC: ${utcTime}`);
      console.log(`  表示用: ${jstDisplayTime}`);
      console.log(`  編集用: ${editFormat}`);
    });

    console.log('\n=== JST → UTC 保存用変換テスト ===');
    
    const jstInputs = ['09:00', '10:00', '10:30', '18:00'];
    const testDate = '2024-01-15';
    
    jstInputs.forEach(jstTime => {
      // This simulates the frontend save logic
      const jstDateTime = new Date(`${testDate}T${jstTime}:00+09:00`);
      const utcDateTime = jstDateTime.toISOString();
      
      console.log(`JST入力: ${jstTime} → UTC保存: ${utcDateTime}`);
    });

    console.log('\n✅ タイムゾーン変換テスト完了');

  } catch (error) {
    console.error('テストエラー:', error);
  }
}

testSimpleTimezone();
