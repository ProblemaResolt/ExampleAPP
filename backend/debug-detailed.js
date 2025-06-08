const { PrismaClient } = require('@prisma/client');
const { getEffectiveWorkSettings, checkLateArrival } = require('./src/utils/workSettings');

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

    // 3. 最近の勤怠記録から遅刻ケースを確認
    const recentAttendance = await prisma.timeEntry.findMany({
      where: {
        clockIn: {
          not: null
        },
        date: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 20
    });

    console.log('📊 Recent Attendance Records (Last 20):');
    for (const entry of recentAttendance) {
      const currentDate = entry.date;
      const workSettings = await getEffectiveWorkSettings(entry.userId, currentDate, currentDate);
      
      if (entry.clockIn) {
        const lateCheck = checkLateArrival(entry.clockIn, workSettings.effective);
        const clockInTimeStr = entry.clockIn.toTimeString().slice(0, 5);
        
        console.log(`  ${entry.user.firstName} ${entry.user.lastName} - ${currentDate.toISOString().split('T')[0]}`);
        console.log(`    Clock In: ${clockInTimeStr}, Expected: ${workSettings.effective.workStartTime}`);
        console.log(`    Settings Source: ${workSettings.effective.settingSource}`);
        if (workSettings.effective.projectWorkSettingName) {
          console.log(`    Project Setting: ${workSettings.effective.projectWorkSettingName}`);
        }
        console.log(`    Late? ${lateCheck.isLate} (${lateCheck.lateMinutes} min)`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWorkSettings();
