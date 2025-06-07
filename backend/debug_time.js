const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeEntries() {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: new Date('2025-06-01'),
          lte: new Date('2025-06-02')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('=== Time Entries Debug ===');
    entries.forEach(entry => {
      console.log(`ID: ${entry.id}`);
      console.log(`Date: ${entry.date}`);
      console.log(`ClockIn: ${entry.clockIn}`);
      console.log(`ClockOut: ${entry.clockOut}`);
      console.log(`CreatedAt: ${entry.createdAt}`);
      
      if (entry.clockIn) {
        const clockInJST = new Date(entry.clockIn).toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'});
        console.log(`ClockIn JST: ${clockInJST}`);
      }
      if (entry.clockOut) {
        const clockOutJST = new Date(entry.clockOut).toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'});
        console.log(`ClockOut JST: ${clockOutJST}`);
      }
      console.log('---');
    });
    
    console.log(`\nTotal entries: ${entries.length}`);
    
    // 新しい時刻を作成してどう保存されるかテスト
    console.log('\n=== Current Time Test ===');
    const now = new Date();
    console.log(`Current time (new Date()): ${now}`);
    console.log(`Current time UTC: ${now.toUTCString()}`);
    console.log(`Current time JST: ${now.toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeEntries();
