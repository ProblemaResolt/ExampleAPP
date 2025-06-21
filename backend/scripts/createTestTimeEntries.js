const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestTimeEntries() {
  try {
    // 中村愛さん (cmbz9f5jy001c2m4htz9bsu1i) の2025年6月の勤怠データを作成
    const userId = 'cmbz9f5jy001c2m4htz9bsu1i';
    const year = 2025;
    const month = 6;

    // 6月の平日（約20日分）の勤怠データを作成
    const workDays = [];
    for (let day = 1; day <= 20; day++) {
      const date = new Date(year, month - 1, day);
      
      // 土日をスキップ
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // 出勤時刻 (9:00 ± 30分のランダム)
      const clockInHour = 9;
      const clockInMinute = Math.floor(Math.random() * 60) - 30; // -30 to +30 minutes
      const clockIn = new Date(year, month - 1, day, clockInHour, Math.max(0, clockInMinute));
      
      // 退勤時刻 (18:00 ± 60分のランダム)
      const clockOutHour = 18;
      const clockOutMinute = Math.floor(Math.random() * 120) - 60; // -60 to +60 minutes
      const clockOut = new Date(year, month - 1, day, clockOutHour, Math.max(0, clockOutMinute));
      
      // 労働時間計算 (時間単位)
      const workHours = (clockOut - clockIn) / (1000 * 60 * 60) - 1; // 1時間休憩を引く
      
      // ステータスをランダムに設定 (承認済み70%, 承認待ち25%, 却下5%)
      const statusRand = Math.random();
      let status;
      if (statusRand < 0.7) status = 'APPROVED';
      else if (statusRand < 0.95) status = 'PENDING';
      else status = 'REJECTED';

      workDays.push({
        userId: userId,
        date: new Date(year, month - 1, day),
        clockIn: clockIn,
        clockOut: clockOut,
        workHours: parseFloat(workHours.toFixed(2)),
        breakTime: 60, // 60分休憩
        status: status,
        notes: day % 5 === 0 ? '定時退社' : null
      });
    }

    // バルクインサート
    const result = await prisma.timeEntry.createMany({
      data: workDays,
      skipDuplicates: true
    });

    console.log(`✅ ${result.count}件の勤怠データを作成しました`);

    // 他のメンバーの分も少し作成
    const otherUsers = [
      'cmbz9f5de00182m4hende1fl3', // 伊藤健太
      'cmbz9f5fj001a2m4hgc8qg5do', // 渡辺優子
    ];

    for (const otherUserId of otherUsers) {
      const otherWorkDays = [];
      for (let day = 1; day <= 15; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        const clockIn = new Date(year, month - 1, day, 9, Math.floor(Math.random() * 30));
        const clockOut = new Date(year, month - 1, day, 18, Math.floor(Math.random() * 60));
        const workHours = (clockOut - clockIn) / (1000 * 60 * 60) - 1;
        
        const statusRand = Math.random();
        let status = statusRand < 0.8 ? 'APPROVED' : 'PENDING';

        otherWorkDays.push({
          userId: otherUserId,
          date: new Date(year, month - 1, day),
          clockIn: clockIn,
          clockOut: clockOut,
          workHours: parseFloat(workHours.toFixed(2)),
          breakTime: 60,
          status: status
        });
      }

      const otherResult = await prisma.timeEntry.createMany({
        data: otherWorkDays,
        skipDuplicates: true
      });

      console.log(`✅ ユーザー ${otherUserId} の ${otherResult.count}件の勤怠データを作成しました`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTimeEntries();
