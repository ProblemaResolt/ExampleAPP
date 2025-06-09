// 月次APIの詳細デバッグスクリプト（修正版）
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function debugMonthlyAPI() {
  try {
    console.log('🔍 月次API詳細デバッグ - 2025年6月');
    
    // まず、全ユーザーを確認
    const allUsers = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    console.log(`👥 登録ユーザー数: ${allUsers.length}`);
    allUsers.forEach((u, index) => {
      console.log(`${index + 1}. ${u.lastName} ${u.firstName} (${u.email}) - ID: ${u.id}`);
    });
    
    // 月次設定
    const year = 2025;
    const month = 6;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // 2025年6月の勤怠データがあるユーザーを探す
    const usersWithAttendance = await prisma.user.findMany({
      where: {
        timeEntries: {
          some: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      include: {
        timeEntries: {
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    });
    
    console.log(`📊 2025年6月に勤怠データがあるユーザー: ${usersWithAttendance.length}名`);
    
    if (usersWithAttendance.length === 0) {
      console.log('❌ 2025年6月の勤怠データが見つかりません');
      
      // 最新の勤怠データを確認
      const latestEntries = await prisma.timeEntry.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { date: 'desc' },
        take: 5
      });
      
      console.log('\n📅 最新の勤怠データ:');
      latestEntries.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.user.lastName} ${entry.user.firstName} - ${entry.date.toISOString().split('T')[0]}`);
      });
      
      return;
    }
    
    // 最初のユーザーでテスト
    const user = usersWithAttendance[0];
    
    console.log(`✅ テスト対象ユーザー: ${user.lastName} ${user.firstName} (ID: ${user.id})`);
    console.log(`📅 期間: ${startDate.toISOString()} 〜 ${endDate.toISOString()}`);
    
    // 勤務設定を取得
    const workSettings = await getEffectiveWorkSettings(user.id, startDate, endDate);
    console.log('⚙️ 有効な勤務設定:', workSettings?.effective);
    
    // 勤怠データを取得
    const attendanceData = await prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`📊 勤怠データ件数: ${attendanceData.length}`);
    
    // 各エントリの遅刻判定を詳細チェック
    console.log('\n🔍 各エントリの遅刻判定:');
    let manualLateCount = 0;
    
    attendanceData.forEach((entry, index) => {
      console.log(`\n--- エントリ ${index + 1} ---`);
      console.log(`ID: ${entry.id}`);
      console.log(`日付: ${entry.date.toISOString().split('T')[0]}`);
      console.log(`出勤時刻: ${entry.clockIn ? entry.clockIn.toISOString() : 'なし'}`);
      console.log(`退勤時刻: ${entry.clockOut ? entry.clockOut.toISOString() : 'なし'}`);
      
      if (!entry.clockIn) {
        console.log('⭕ 出勤時刻なし → 遅刻判定対象外');
        return;
      }
      
      if (!workSettings?.effective) {
        console.log('⚠️ 勤務設定なし → 遅刻判定スキップ');
        return;
      }
      
      const lateResult = checkLateArrival(entry.clockIn, workSettings.effective);
      console.log(`⏰ 遅刻判定結果:`, lateResult);
      console.log(`   開始時刻設定: ${workSettings.effective.startTime}`);
      console.log(`   遅刻判定: ${lateResult.isLate ? '遅刻' : '正常'}`);
      
      if (lateResult.isLate) {
        manualLateCount++;
      }
    });
    
    console.log('\n📈 最終結果:');
    console.log(`手動計算による遅刻カウント: ${manualLateCount}`);
    
    // フィルター関数で計算（実際のAPIと同じロジック）
    const apiLateCount = attendanceData.filter(entry => {
      if (!entry.clockIn) return false;
      if (!workSettings?.effective) return false;
      const lateResult = checkLateArrival(entry.clockIn, workSettings.effective);
      return lateResult.isLate;
    }).length;
    
    console.log(`API計算による遅刻カウント: ${apiLateCount}`);
    
    if (manualLateCount === apiLateCount) {
      console.log('✅ 手動計算とAPI計算が一致');
    } else {
      console.log('❌ 手動計算とAPI計算が不一致');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  debugMonthlyAPI();
}

module.exports = { debugMonthlyAPI };
