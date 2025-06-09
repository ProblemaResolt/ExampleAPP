const { PrismaClient } = require('@prisma/client');
const { checkLateArrival, getEffectiveWorkSettings } = require('../src/utils/workSettings');

async function debugSatoData() {
  const prisma = new PrismaClient();
  
  try {
    const satoUserId = 'cmbmiqzlc001t14518rym0gis';
    const year = 2025;
    const month = 6;
    
    console.log('🔍 調査対象: 佐藤 次郎さん');
    console.log('   User ID:', satoUserId);
    console.log('   対象月:', year + '年' + month + '月');
    console.log('');
    
    // 月の開始日と終了日
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // 勤務設定を取得
    const workSettings = await getEffectiveWorkSettings(satoUserId, startDate, endDate);    console.log('📋 勤務設定:');
    console.log('   開始時刻:', workSettings?.effective?.workStartTime);
    console.log('   終了時刻:', workSettings?.effective?.workEndTime);
    console.log('   休憩時間:', workSettings?.effective?.breakTime, '分');
    console.log('');
    
    // 勤怠データを取得
    const attendanceData = await prisma.timeEntry.findMany({
      where: {
        userId: satoUserId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('📊 勤怠データ:');
    console.log('   総エントリー数:', attendanceData.length);
    console.log('');
    
    // 各エントリーを詳細チェック
    let lateCount = 0;
    attendanceData.forEach((entry, index) => {
      console.log(`📅 エントリー ${index + 1}: ${entry.date.toISOString().split('T')[0]}`);
      console.log('   ID:', entry.id);
      console.log('   出勤時刻:', entry.clockIn ? entry.clockIn.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}) : 'なし');
      console.log('   退勤時刻:', entry.clockOut ? entry.clockOut.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}) : 'なし');
      console.log('   ステータス:', entry.status);
      
      if (entry.clockIn) {
        const lateResult = checkLateArrival(entry.clockIn, workSettings.effective);
        console.log('   遅刻判定結果:');
        console.log('     isLate:', lateResult.isLate);
        console.log('     reason:', lateResult.reason);
        console.log('     actualTime:', lateResult.actualTime);
        console.log('     expectedTime:', lateResult.expectedTime);
        console.log('     delayMinutes:', lateResult.delayMinutes);
        
        if (lateResult.isLate) {
          lateCount++;
          console.log('   ⚠️ 遅刻としてカウント');
        } else {
          console.log('   ✅ 正常出勤');
        }
      } else {
        console.log('   ⏰ 出勤時刻なし - 遅刻判定スキップ');
      }
      console.log('');
    });
    
    console.log('🎯 最終結果:');
    console.log('   計算された遅刻回数:', lateCount);
    console.log('   期待される値: 0');
    console.log('   一致:', lateCount === 0 ? '✅' : '❌');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSatoData();
