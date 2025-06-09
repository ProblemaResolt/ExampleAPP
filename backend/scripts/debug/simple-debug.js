const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simpleDebug() {
  try {
    console.log('Starting simple debug...');

    // 佐藤次郎さんの最新の勤怠記録を1件取得
    const entry = await prisma.timeEntry.findFirst({
      where: {
        userId: 'cmbmiqzlc001t14518rym0gis',
        clockIn: { not: null }
      },
      orderBy: { date: 'desc' }
    });

    if (!entry) {
      console.log('No attendance entry found');
      return;
    }

    console.log('Entry found:', {
      date: entry.date.toISOString().split('T')[0],
      clockIn: entry.clockIn.toISOString(),
      clockInTime: entry.clockIn.toTimeString().slice(0, 5)
    });

    // 文字列比較のテスト
    const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
    console.log('String comparisons:');
    console.log(`"${clockInTimeStr}" > "09:00": ${clockInTimeStr > "09:00"}`);
    console.log(`"${clockInTimeStr}" > "10:00": ${clockInTimeStr > "10:00"}`);
    console.log(`"${clockInTimeStr}" > "11:00": ${clockInTimeStr > "11:00"}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleDebug();
