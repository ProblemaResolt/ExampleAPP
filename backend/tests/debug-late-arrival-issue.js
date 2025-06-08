const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('../src/utils/workSettings');

const prisma = new PrismaClient();

async function debugWorkSettings() {
  try {
    console.log('🔍 Debugging work settings and late arrival calculations...\n');

    // 1. すべてのユーザーの個人勤務設定を取得
    const userWorkSettings = await prisma.userWorkSettings.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    console.log('👤 User Work Settings:');
    userWorkSettings.forEach(setting => {
      console.log(`  User: ${setting.user.firstName} ${setting.user.lastName} (${setting.userId})`);
      console.log(`    Work Start: ${setting.workStartTime}, Work End: ${setting.workEndTime}`);
      console.log(`    Work Hours: ${setting.workHours}, Break: ${setting.breakTime}min`);
      console.log('');
    });

    // 2. プロジェクト勤務設定を取得
    const projectWorkSettings = await prisma.projectWorkSettings.findMany({
      include: {
        project: {
          select: { id: true, name: true }
        },
        userAssignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    console.log('📋 Project Work Settings:');
    projectWorkSettings.forEach(setting => {
      console.log(`  Project: ${setting.project.name} (${setting.projectId})`);
      console.log(`    Setting Name: ${setting.name}`);
      console.log(`    Work Start: ${setting.workStartTime}, Work End: ${setting.workEndTime}`);
      console.log(`    Break Duration: ${setting.breakDuration}min`);
      console.log(`    User Assignments: ${setting.userAssignments.length}`);
      setting.userAssignments.forEach(assignment => {
        console.log(`      - ${assignment.user.firstName} ${assignment.user.lastName} (Active: ${assignment.isActive})`);
      });
      console.log('');
    });

    // 3. 10:00開始時間を持つユーザーを特定
    const tenAmUsers = userWorkSettings.filter(setting => setting.workStartTime === '10:00');
    
    if (tenAmUsers.length > 0) {
      console.log('🕙 Users with 10:00 AM start time:');
      for (const userSetting of tenAmUsers) {
        console.log(`  ${userSetting.user.firstName} ${userSetting.user.lastName} (${userSetting.userId})`);
        
        // このユーザーの最近の勤怠記録を確認
        const recentEntries = await prisma.timeEntry.findMany({
          where: {
            userId: userSetting.userId,
            clockIn: { not: null },
            date: {
              gte: new Date('2024-01-01')
            }
          },
          orderBy: { date: 'desc' },
          take: 5
        });

        console.log(`    Recent attendance (last 5 entries):`);
        for (const entry of recentEntries) {
          const workSettings = await getEffectiveWorkSettings(entry.userId, entry.date, entry.date);
          const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
          const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
          
          console.log(`      ${entry.date.toISOString().split('T')[0]} - Clock in: ${clockInTimeStr}`);
          console.log(`        Expected: ${workSettings.effective.workStartTime} (Source: ${workSettings.effective.settingSource})`);
          console.log(`        Late? ${lateCheck.isLate} (${lateCheck.lateMinutes} min)`);
          
          if (workSettings.effective.projectWorkSettingName) {
            console.log(`        Project Setting: ${workSettings.effective.projectWorkSettingName}`);
          }
        }
        console.log('');
      }
    } else {
      console.log('🔍 No users found with 10:00 AM start time in personal settings.');
    }

    // 4. プロジェクト設定で10:00開始のものを確認
    const tenAmProjectSettings = projectWorkSettings.filter(setting => setting.workStartTime === '10:00');
    
    if (tenAmProjectSettings.length > 0) {
      console.log('📋 Project settings with 10:00 AM start time:');
      for (const projectSetting of tenAmProjectSettings) {
        console.log(`  Project: ${projectSetting.project.name}`);
        console.log(`  Setting: ${projectSetting.name}`);
        console.log(`  Assigned users: ${projectSetting.userAssignments.length}`);
        
        for (const assignment of projectSetting.userAssignments.filter(a => a.isActive)) {
          console.log(`    - ${assignment.user.firstName} ${assignment.user.lastName}`);
          
          // このユーザーの最近の勤怠記録を確認
          const recentEntries = await prisma.timeEntry.findMany({
            where: {
              userId: assignment.userId,
              clockIn: { not: null },
              date: {
                gte: new Date('2024-01-01')
              }
            },
            orderBy: { date: 'desc' },
            take: 3
          });

          for (const entry of recentEntries) {
            const workSettings = await getEffectiveWorkSettings(entry.userId, entry.date, entry.date);
            const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
            const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
            
            console.log(`      ${entry.date.toISOString().split('T')[0]} - ${clockInTimeStr} (Expected: ${workSettings.effective.workStartTime})`);
            console.log(`        Source: ${workSettings.effective.settingSource}, Late? ${lateCheck.isLate}`);
          }
        }
        console.log('');
      }
    }

    // 5. 遅刻として記録されているエントリを確認
    console.log('⚠️  Checking for entries incorrectly marked as late...');
    
    const allRecentEntries = await prisma.timeEntry.findMany({
      where: {
        clockIn: { not: null },
        date: {
          gte: new Date('2024-01-01')
        }
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 50
    });

    const suspiciousEntries = [];
    
    for (const entry of allRecentEntries) {
      const workSettings = await getEffectiveWorkSettings(entry.userId, entry.date, entry.date);
      const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
      const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
      
      // 10:00開始で10:00より前に出勤しているのに遅刻と判定されているケース
      if (workSettings.effective.workStartTime === '10:00' && clockInTimeStr <= '10:00' && lateCheck.isLate) {
        suspiciousEntries.push({
          entry,
          workSettings: workSettings.effective,
          lateCheck,
          clockInTimeStr
        });
      }
    }

    if (suspiciousEntries.length > 0) {
      console.log(`Found ${suspiciousEntries.length} suspicious late entries:`);
      suspiciousEntries.forEach(({ entry, workSettings, lateCheck, clockInTimeStr }) => {
        console.log(`  ${entry.user.firstName} ${entry.user.lastName} - ${entry.date.toISOString().split('T')[0]}`);
        console.log(`    Clock in: ${clockInTimeStr}, Expected: ${workSettings.workStartTime}`);
        console.log(`    Incorrectly marked as late: ${lateCheck.lateMinutes} minutes`);
        console.log(`    Settings source: ${workSettings.settingSource}`);
      });
    } else {
      console.log('No suspicious late entries found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWorkSettings();
