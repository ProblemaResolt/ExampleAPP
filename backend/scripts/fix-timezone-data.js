const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTimezoneData() {
  console.log('🔧 Starting timezone data migration...');
  
  try {
    // 全ての時間エントリーを取得
    const allEntries = await prisma.timeEntry.findMany({
      where: {
        OR: [
          { clockIn: { not: null } },
          { clockOut: { not: null } }
        ]
      },
      orderBy: { date: 'desc' }
    });
    
    console.log(`📊 Found ${allEntries.length} entries to check`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const entry of allEntries) {
      const updateData = {};
      let needsUpdate = false;
      
      // clockInの確認と修正
      if (entry.clockIn) {
        const clockInHour = entry.clockIn.getUTCHours();
        
        // もしUTC時間が9-23時の範囲なら、これはJST時間がUTCとして保存されている可能性が高い
        // 日本の一般的な勤務時間（6:00-24:00 JST = 21:00-15:00 UTC）を考慮
        if (clockInHour >= 6 && clockInHour <= 23) {
          // JST時間として扱われたデータをUTCに変換（-9時間）
          const correctedClockIn = new Date(entry.clockIn.getTime() - (9 * 60 * 60 * 1000));
          updateData.clockIn = correctedClockIn;
          needsUpdate = true;
          
          console.log(`📅 Entry ${entry.id} - Clock In:`);
          console.log(`  Original (UTC): ${entry.clockIn.toISOString()}`);
          console.log(`  Corrected (UTC): ${correctedClockIn.toISOString()}`);
          console.log(`  JST equivalent: ${new Date(correctedClockIn.getTime() + 9*60*60*1000).toISOString()}`);
        }
      }
      
      // clockOutの確認と修正
      if (entry.clockOut) {
        const clockOutHour = entry.clockOut.getUTCHours();
        
        // 同様の判定ロジック
        if (clockOutHour >= 6 && clockOutHour <= 23) {
          const correctedClockOut = new Date(entry.clockOut.getTime() - (9 * 60 * 60 * 1000));
          updateData.clockOut = correctedClockOut;
          needsUpdate = true;
          
          console.log(`📅 Entry ${entry.id} - Clock Out:`);
          console.log(`  Original (UTC): ${entry.clockOut.toISOString()}`);
          console.log(`  Corrected (UTC): ${correctedClockOut.toISOString()}`);
          console.log(`  JST equivalent: ${new Date(correctedClockOut.getTime() + 9*60*60*1000).toISOString()}`);
        }
      }
      
      if (needsUpdate) {
        // 勤務時間も再計算
        if (updateData.clockIn && updateData.clockOut) {
          const workMinutes = (updateData.clockOut - updateData.clockIn) / (1000 * 60);
          const breakMinutes = entry.breakTime || 60;
          updateData.workHours = Math.max(0, (workMinutes - breakMinutes) / 60);
        } else if (updateData.clockIn && entry.clockOut) {
          const workMinutes = (entry.clockOut - updateData.clockIn) / (1000 * 60);
          const breakMinutes = entry.breakTime || 60;
          updateData.workHours = Math.max(0, (workMinutes - breakMinutes) / 60);
        } else if (entry.clockIn && updateData.clockOut) {
          const workMinutes = (updateData.clockOut - entry.clockIn) / (1000 * 60);
          const breakMinutes = entry.breakTime || 60;
          updateData.workHours = Math.max(0, (workMinutes - breakMinutes) / 60);
        }
        
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: updateData
        });
        
        updatedCount++;
        console.log(`✅ Updated entry ${entry.id}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped entry ${entry.id} - appears to be correct`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  Total entries checked: ${allEntries.length}`);
    console.log(`  Entries updated: ${updatedCount}`);
    console.log(`  Entries skipped: ${skippedCount}`);
    console.log('✅ Timezone data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
if (require.main === module) {
  fixTimezoneData()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTimezoneData };
