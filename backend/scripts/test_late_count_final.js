// 最終的な遅刻回数計算テスト
const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function testLateCountCalculation() {
  try {
    console.log('🧪 Final late count calculation test...\n');

    // 10:00開始時間のプロジェクト設定を持つユーザーを検索
    const projectSettings = await prisma.projectWorkSettings.findMany({
      where: {
        workStartTime: '10:00'
      },
      include: {
        userAssignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        project: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${projectSettings.length} project settings with 10:00 start time`);

    for (const setting of projectSettings) {
      console.log(`\n📋 Project: ${setting.project.name}`);
      console.log(`   Setting: ${setting.name} (${setting.workStartTime}-${setting.workEndTime})`);
      
      for (const assignment of setting.userAssignments) {
        const user = assignment.user;
        console.log(`\n👤 User: ${user.firstName} ${user.lastName}`);

        // このユーザーの最近の勤怠記録を確認
        const entries = await prisma.timeEntry.findMany({
          where: {
            userId: user.id,
            clockIn: { not: null },
            date: { gte: new Date('2025-06-01') }
          },
          orderBy: { date: 'desc' },
          take: 5
        });

        console.log(`   Found ${entries.length} recent entries:`);

        let lateCount = 0;
        
        for (const entry of entries) {
          // 効果的な勤務設定を取得
          const workSettings = await getEffectiveWorkSettings(user.id, entry.date, entry.date);
          
          // 遅刻判定を実行
          const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
          const clockInStr = entry.clockIn.toTimeString().slice(0, 5);
          
          console.log(`   ${entry.date.toISOString().split('T')[0]}: ${clockInStr} (Expected: ${workSettings.effective.workStartTime})`);
          console.log(`     → Settings source: ${workSettings.effective.settingSource}`);
          console.log(`     → Project name: ${workSettings.effective.projectName || 'N/A'}`);
          console.log(`     → Late: ${lateCheck.isLate} ${lateCheck.isLate ? `(${lateCheck.lateMinutes}min)` : ''}`);
          
          if (lateCheck.isLate) {
            lateCount++;
          }
          
          // 問題のケースをチェック
          if (workSettings.effective.workStartTime === '10:00' && 
              clockInStr <= '10:00' && 
              lateCheck.isLate) {
            console.log(`     ❌ PROBLEM: ${clockInStr} should NOT be late for 10:00 start time!`);
          } else if (workSettings.effective.workStartTime === '10:00' && 
                     clockInStr <= '10:00' && 
                     !lateCheck.isLate) {
            console.log(`     ✅ CORRECT: ${clockInStr} is not marked as late for 10:00 start time`);
          }
        }
        
        console.log(`   → Total late count for this user: ${lateCount}`);
      }
    }

    // API結果と手動計算の比較テスト
    console.log('\n\n🔍 API vs Manual Calculation Test:');
    
    if (projectSettings.length > 0 && projectSettings[0].userAssignments.length > 0) {
      const testUser = projectSettings[0].userAssignments[0].user;
      const year = 2025;
      const month = 6;
      
      console.log(`Testing user: ${testUser.firstName} ${testUser.lastName} for ${year}-${month}`);
      
      // 手動計算
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const entries = await prisma.timeEntry.findMany({
        where: {
          userId: testUser.id,
          date: { gte: startDate, lte: endDate },
          clockIn: { not: null }
        }
      });
      
      let manualLateCount = 0;
      
      for (const entry of entries) {
        const workSettings = await getEffectiveWorkSettings(testUser.id, entry.date, entry.date);
        const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
        
        if (lateCheck.isLate) {
          manualLateCount++;
        }
      }
      
      console.log(`Manual calculation: ${manualLateCount} late days`);
      console.log(`Expected: Should be 0 for users with 10:00 start time arriving at/before 10:00`);
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLateCountCalculation();
