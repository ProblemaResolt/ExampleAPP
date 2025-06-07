const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIResponse() {
  try {
    const year = 2025;
    const month = 6;
    
    // 月の開始日と終了日
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    console.log('=== API Response Test ===');
    console.log(`Date range: ${startDate} to ${endDate}`);

    // 勤怠データを取得（APIと同じロジック）
    const attendanceData = await prisma.timeEntry.findMany({
      where: {
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

    // 日付をキーとしたオブジェクトに変換（APIと同じロジック）
    const attendanceByDate = {};
    attendanceData.forEach(entry => {
      const dateKey = entry.date.toISOString().split('T')[0];
      attendanceByDate[dateKey] = {
        id: entry.id,
        date: entry.date,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        workHours: entry.workHours || 0,
        status: entry.status,
        note: entry.note,
        leaveType: entry.leaveType,
        transportationCost: entry.transportationCost
      };
    });

    console.log('\n=== Raw Database Data ===');
    attendanceData.forEach(entry => {
      console.log(`Date: ${entry.date}`);
      console.log(`ClockIn: ${entry.clockIn}`);
      console.log(`ClockOut: ${entry.clockOut}`);
      console.log('---');
    });

    console.log('\n=== API Response Format ===');
    console.log('Keys:', Object.keys(attendanceByDate));
    Object.entries(attendanceByDate).forEach(([dateKey, data]) => {
      console.log(`\n${dateKey}:`);
      console.log(`  clockIn: ${data.clockIn}`);
      console.log(`  clockOut: ${data.clockOut}`);
      console.log(`  clockIn ISO: ${data.clockIn ? data.clockIn.toISOString() : 'null'}`);
      console.log(`  clockOut ISO: ${data.clockOut ? data.clockOut.toISOString() : 'null'}`);
    });

    console.log('\n=== JSON Serialization Test ===');
    const jsonString = JSON.stringify(attendanceByDate, null, 2);
    console.log(jsonString);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIResponse();
