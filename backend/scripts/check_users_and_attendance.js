// ユーザーと勤怠データの確認スクリプト
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsersAndAttendance() {
  try {
    console.log('🔍 ユーザーと勤怠データ確認');
    
    // 全ユーザーを取得
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    
    console.log(`\n👥 登録ユーザー数: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.lastName} ${user.firstName} (${user.email}) - ID: ${user.id}`);
    });
    
    // 2025年6月の勤怠データがあるユーザーを確認
    const year = 2025;
    const month = 6;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    console.log(`\n📅 ${year}年${month}月の勤怠データ確認`);
    console.log(`期間: ${startDate.toISOString()} 〜 ${endDate.toISOString()}`);
    
    const attendanceUsers = await prisma.timeEntry.findMany({
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
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });
    
    if (attendanceUsers.length === 0) {
      console.log('❌ 2025年6月の勤怠データが見つかりません');
      
      // 他の月のデータを確認
      console.log('\n🔍 他の期間の勤怠データを確認...');
      const allAttendance = await prisma.timeEntry.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      });
      
      console.log(`最新の勤怠データ ${allAttendance.length} 件:`);
      allAttendance.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.user.lastName} ${entry.user.firstName} - ${entry.date.toISOString().split('T')[0]} (${entry.clockIn ? '出勤' : '未出勤'})`);
      });
      
      return;
    }
    
    console.log(`\n📊 ${year}年${month}月の勤怠データ: ${attendanceUsers.length} 件`);
    
    // ユーザーごとにグループ化
    const userGroups = {};
    attendanceUsers.forEach(entry => {
      const userId = entry.user.id;
      if (!userGroups[userId]) {
        userGroups[userId] = {
          user: entry.user,
          entries: []
        };
      }
      userGroups[userId].entries.push(entry);
    });
    
    console.log('\nユーザー別勤怠データ:');
    Object.values(userGroups).forEach(group => {
      console.log(`\n👤 ${group.user.lastName} ${group.user.firstName} (ID: ${group.user.id})`);
      console.log(`   勤怠データ件数: ${group.entries.length}`);
      
      group.entries.forEach(entry => {
        console.log(`   - ${entry.date.toISOString().split('T')[0]}: ${entry.clockIn ? entry.clockIn.toISOString() : '未出勤'} 〜 ${entry.clockOut ? entry.clockOut.toISOString() : '未退勤'}`);
      });
    });
    
    // 最初のユーザーで詳細テストを実行
    if (Object.keys(userGroups).length > 0) {
      const firstUserId = Object.keys(userGroups)[0];
      const firstUser = userGroups[firstUserId].user;
      console.log(`\n🎯 ${firstUser.lastName} ${firstUser.firstName} で詳細テスト実行...`);
      
      // このユーザーのIDを返す
      return firstUser.id;
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  checkUsersAndAttendance().then(userId => {
    if (userId) {
      console.log(`\n✅ テスト対象ユーザーID: ${userId}`);
    }
  });
}

module.exports = { checkUsersAndAttendance };
