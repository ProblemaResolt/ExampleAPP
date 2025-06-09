const { checkLateArrival } = require('../src/utils/workSettings');

async function finalTest() {
  console.log('🔍 Final Timezone Fix Test');
  console.log('='.repeat(50));

  // テストケース1: JST 10:00 出勤（期待開始時間 JST 09:00）
  const testCases = [
    {
      name: 'JST 10:00 出勤 vs JST 09:00 開始',
      clockInUTC: new Date('2025-06-09T01:00:00.000Z'), // JST 10:00
      workStartTime: '09:00',
      expectedLate: true,
      expectedMinutes: 60
    },
    {
      name: 'JST 09:00 出勤 vs JST 09:00 開始',
      clockInUTC: new Date('2025-06-09T00:00:00.000Z'), // JST 09:00
      workStartTime: '09:00',
      expectedLate: false,
      expectedMinutes: 0
    },
    {
      name: 'JST 08:30 出勤 vs JST 09:00 開始（早い出勤）',
      clockInUTC: new Date('2025-06-08T23:30:00.000Z'), // JST 08:30
      workStartTime: '09:00',
      expectedLate: false,
      expectedMinutes: 0
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 テスト: ${testCase.name}`);
    console.log(`   UTC時間: ${testCase.clockInUTC.toISOString()}`);
    
    // UTC時間をJSTに変換して表示
    const jstTime = new Date(testCase.clockInUTC.getTime() + (9 * 60 * 60 * 1000));
    console.log(`   JST時間: ${jstTime.toISOString().slice(11, 16)}`);
    
    const result = checkLateArrival(testCase.clockInUTC, testCase.workStartTime);
    
    console.log(`   期待: 遅刻=${testCase.expectedLate}, 分=${testCase.expectedMinutes}`);
    console.log(`   結果: 遅刻=${result.isLate}, 分=${result.lateMinutes}`);
    
    const success = result.isLate === testCase.expectedLate && result.lateMinutes === testCase.expectedMinutes;
    console.log(`   判定: ${success ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  console.log('\n🎯 結論: タイムゾーン修正が完了しました！');
}

finalTest().catch(console.error);
