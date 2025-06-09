const prisma = require('../src/lib/prisma');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

async function testFrontendBackendFlow() {
  console.log('🔬 Frontend-Backend Flow Test');
  
  try {
    // 実際のユーザーを取得
    const user = await prisma.user.findFirst({
      where: {
        firstName: '佐藤',
        lastName: '次郎'
      }
    });
    
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('👤 Testing with user:', user.firstName, user.lastName);
    
    // 現在の年月でテスト
    const year = 2025;
    const month = 6;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    console.log(`📅 Testing period: ${year}-${month}`);
    
    // 勤務設定を取得
    const workSettings = await getEffectiveWorkSettings(user.id, startDate, endDate);
    console.log('⚙️ Work settings:', {
      source: workSettings.effective.settingSource,
      startTime: workSettings.effective.workStartTime,
      endTime: workSettings.effective.workStartTime
    });
    
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
    
    console.log(`📊 Found ${attendanceData.length} attendance entries`);
    
    // 遅刻カウントを計算（バックエンドと同じロジック）
    let manualLateCount = 0;
    const lateEntries = [];
    
    attendanceData.forEach(entry => {
      if (entry.clockIn) {
        const lateResult = checkLateArrival(entry.clockIn, workSettings.effective);
        if (lateResult.isLate) {
          manualLateCount++;
          lateEntries.push({
            date: entry.date.toISOString().split('T')[0],
            clockIn: entry.clockIn,
            expected: workSettings.effective.workStartTime,
            late: lateResult.isLate,
            lateMinutes: lateResult.lateMinutes
          });
        }
      }
    });
    
    console.log('⏰ Manual late count calculation:', manualLateCount);
    console.log('🚨 Late entries:', lateEntries);
    
    // APIレスポンス形式でモックレスポンスを作成
    const mockAPIResponse = {
      status: 'success',
      data: {
        attendanceData: {},
        monthlyStats: {
          year,
          month,
          workDays: attendanceData.filter(entry => entry.clockIn && entry.clockOut).length,
          totalHours: 0, // 簡略化
          overtimeHours: 0,
          averageHours: 0,
          leaveDays: 0,
          lateCount: manualLateCount,
          transportationCost: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0
        },
        workSettings: workSettings?.effective || {}
      }
    };
    
    console.log('🎯 Mock API Response - monthlyStats:');
    console.log('   lateCount:', mockAPIResponse.data.monthlyStats.lateCount);
    console.log('   type:', typeof mockAPIResponse.data.monthlyStats.lateCount);
    
    // JSONの往復テスト（フロントエンドでの受信をシミュレート）
    const jsonString = JSON.stringify(mockAPIResponse);
    const parsedResponse = JSON.parse(jsonString);
    
    console.log('🔄 After JSON round-trip:');
    console.log('   lateCount:', parsedResponse.data.monthlyStats.lateCount);
    console.log('   type:', typeof parsedResponse.data.monthlyStats.lateCount);
    
    // フロントエンドでの表示シミュレーション
    const displayLateCount = parsedResponse.data.monthlyStats.lateCount || 0;
    console.log('🖥️ Frontend display value:', displayLateCount);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendBackendFlow();
