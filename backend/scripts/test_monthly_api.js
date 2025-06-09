const jwt = require('jsonwebtoken');
const { execSync } = require('child_process');

async function testMonthlyAPI() {
  try {
    console.log('🔍 月次統計APIの調査を開始...');
    
    // JWTトークンを直接生成
    console.log('📝 JWTトークンを生成中...');
    const token = jwt.sign(
      { userId: 'cmbmiqzlc001t14518rym0gis', role: 'employee' }, 
      'your-super-secret-jwt-key-here'
    );
    console.log('🔑 Token generated:', token.substring(0, 50) + '...');
    
    // APIを呼び出し（Docker内なので localhost ではなく内部ネットワーク経由）
    const curlCommand = `curl -s -H "Authorization: Bearer ${token}" "http://localhost:4000/api/attendance/monthly?year=2025&month=6"`;
    
    console.log('📡 月次統計APIを呼び出し中...');
    const response = execSync(curlCommand, { encoding: 'utf8' });
    
    console.log('📊 API レスポンス:');
    console.log(response);
    
    // JSONパース
    try {
      const data = JSON.parse(response);
      console.log('');
      console.log('📈 解析済みデータ:');
      console.log('- 出勤日数:', data.workDays);
      console.log('- 総労働時間:', data.totalHours);
      console.log('- 遅刻回数:', data.lateCount);
      console.log('- 休暇日数:', data.leaveDays);
      console.log('- 承認済み:', data.approvedCount);
      console.log('- 未承認:', data.pendingCount);
    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError.message);
      console.log('生レスポンス:', response);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testMonthlyAPI();
