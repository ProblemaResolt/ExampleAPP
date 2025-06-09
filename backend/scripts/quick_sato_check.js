const { PrismaClient } = require('@prisma/client');

async function quickSatoCheck() {
  const prisma = new PrismaClient();
  
  try {
    const satoUserId = 'cmbmiqzlc001t14518rym0gis';
    
    // 2025年6月の勤怠データ確認
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: satoUserId,
        date: {
          gte: new Date(2025, 5, 1), // 6月1日
          lte: new Date(2025, 5, 30), // 6月30日
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('佐藤さんの2025年6月の勤怠データ:');
    console.log(`エントリー数: ${timeEntries.length}`);
    
    timeEntries.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.date.toISOString().split('T')[0]}`);
      console.log(`   出勤: ${entry.clockIn ? entry.clockIn.toISOString() : 'なし'}`);
      console.log(`   退勤: ${entry.clockOut ? entry.clockOut.toISOString() : 'なし'}`);
      console.log(`   ステータス: ${entry.status}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickSatoCheck();
