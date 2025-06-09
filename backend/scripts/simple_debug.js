require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 簡単な佐藤次郎さんのデータ確認...');
    
    const satoUserId = 'cmbmiqzlc001t14518rym0gis';
    
    // ユーザー情報確認
    const user = await prisma.user.findUnique({
      where: { id: satoUserId },
      select: { name: true, workHours: true, workStartTime: true, workEndTime: true }
    });
    
    console.log('👤 ユーザー情報:', user);
    
    // 2025年6月の勤怠データ数を確認
    const count = await prisma.attendance.count({
      where: {
        userId: satoUserId,
        date: {
          gte: new Date('2025-06-01'),
          lt: new Date('2025-07-01')
        }
      }
    });
    
    console.log('📊 2025年6月の勤怠データ数:', count);
    
    // 出勤データがあるもの
    const attendanceWithClockIn = await prisma.attendance.findMany({
      where: {
        userId: satoUserId,
        date: {
          gte: new Date('2025-06-01'),
          lt: new Date('2025-07-01')
        },
        clockIn: { not: null }
      },
      select: {
        date: true,
        clockIn: true,
        lateMinutes: true
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('🕐 出勤データがある日:');
    attendanceWithClockIn.forEach(entry => {
      const clockInJST = entry.clockIn.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'});
      console.log(`  ${entry.date.toISOString().split('T')[0]} - 出勤: ${clockInJST}, 遅刻分: ${entry.lateMinutes || 0}`);
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
