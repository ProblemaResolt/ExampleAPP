const { PrismaClient } = require('@prisma/client');

async function checkAndFixData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Checking current data...');
    
    // 最新のデータを確認
    const entries = await prisma.timeEntry.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${entries.length} entries`);
    
    for (const entry of entries) {
      console.log(`\nEntry ${entry.id}:`);
      if (entry.clockIn) {
        console.log(`  Clock In (stored UTC): ${entry.clockIn.toISOString()}`);
        console.log(`  Clock In (as JST): ${new Date(entry.clockIn.getTime() + 9*60*60*1000).toISOString()}`);
        console.log(`  Clock In UTC hour: ${entry.clockIn.getUTCHours()}`);
      }
      if (entry.clockOut) {
        console.log(`  Clock Out (stored UTC): ${entry.clockOut.toISOString()}`);
        console.log(`  Clock Out (as JST): ${new Date(entry.clockOut.getTime() + 9*60*60*1000).toISOString()}`);
      }
    }
    
    // 問題のあるデータを検出
    const problematicEntries = await prisma.timeEntry.findMany({
      where: {
        OR: [
          {
            clockIn: {
              not: null
            }
          }
        ]
      }
    });
    
    console.log(`\n🔍 Analyzing ${problematicEntries.length} entries for timezone issues...`);
    
    let needsFixCount = 0;
    
    for (const entry of problematicEntries) {
      if (entry.clockIn) {
        const utcHour = entry.clockIn.getUTCHours();
        // JST勤務時間(6:00-24:00)がUTCとして保存されていないかチェック
        if (utcHour >= 6 && utcHour <= 23) {
          needsFixCount++;
          console.log(`❌ Entry ${entry.id} likely needs fix: clockIn UTC hour ${utcHour}`);
        }
      }
    }
    
    console.log(`\n📋 Summary: ${needsFixCount} entries may need timezone correction`);
    
    if (needsFixCount > 0) {
      console.log('\n🔧 Apply fixes? This will:');
      console.log('1. Convert JST times incorrectly stored as UTC to proper UTC');
      console.log('2. Subtract 9 hours from problematic entries');
      console.log('3. Recalculate work hours');
      
      // For demo purposes, let's fix one entry
      const testEntry = problematicEntries.find(e => e.clockIn && e.clockIn.getUTCHours() >= 6);
      if (testEntry) {
        console.log(`\n🧪 Testing fix on entry ${testEntry.id}...`);
        
        const originalClockIn = testEntry.clockIn;
        const correctedClockIn = new Date(originalClockIn.getTime() - (9 * 60 * 60 * 1000));
        
        console.log(`Before: ${originalClockIn.toISOString()} (UTC) -> JST display: ${new Date(originalClockIn.getTime() + 9*60*60*1000).toISOString()}`);
        console.log(`After:  ${correctedClockIn.toISOString()} (UTC) -> JST display: ${new Date(correctedClockIn.getTime() + 9*60*60*1000).toISOString()}`);
        
        // Actually apply the fix
        await prisma.timeEntry.update({
          where: { id: testEntry.id },
          data: { clockIn: correctedClockIn }
        });
        
        console.log(`✅ Test fix applied to entry ${testEntry.id}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixData();
