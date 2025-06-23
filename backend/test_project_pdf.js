const PDFGenerator = require('./src/utils/pdfGenerator');
const fs = require('fs');

// プロジェクト全体のテスト用データ（複数メンバーの詳細勤怠記録）
const projectTestData = {
  project: {
    name: 'Webシステム開発プロジェクト'
  },
  period: {
    year: 2025,
    month: 6
  },
  members: [
    {
      user: {
        firstName: '太郎',
        lastName: '田中'
      },
      totalHours: 120.7,
      timeEntries: [
        {
          date: '2025-06-02',
          clockIn: '2025-06-02T09:16:00Z',
          clockOut: '2025-06-02T18:39:00Z',
          workHours: 8.4,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-03',
          clockIn: '2025-06-03T09:36:00Z',
          clockOut: '2025-06-03T18:35:00Z',
          workHours: 8.0,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-04',
          clockIn: '2025-06-04T09:00:00Z',
          clockOut: '2025-06-04T18:21:00Z',
          workHours: 8.3,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-05',
          clockIn: '2025-06-05T09:42:00Z',
          clockOut: '2025-06-05T18:30:00Z',
          workHours: 7.8,
          breakTime: 60,
          status: 'PENDING',
          notes: null
        },
        {
          date: '2025-06-06',
          clockIn: '2025-06-06T09:25:00Z',
          clockOut: '2025-06-06T18:59:00Z',
          workHours: 8.6,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        }
      ]
    },
    {
      user: {
        firstName: '花子',
        lastName: '佐藤'
      },
      totalHours: 160.2,
      timeEntries: [
        {
          date: '2025-06-02',
          clockIn: '2025-06-02T08:45:00Z',
          clockOut: '2025-06-02T18:15:00Z',
          workHours: 8.5,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-03',
          clockIn: '2025-06-03T09:00:00Z',
          clockOut: '2025-06-03T18:00:00Z',
          workHours: 8.0,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-04',
          clockIn: '2025-06-04T08:50:00Z',
          clockOut: '2025-06-04T19:00:00Z',
          workHours: 9.2,
          breakTime: 60,
          status: 'APPROVED',
          notes: '残業対応'
        },
        {
          date: '2025-06-05',
          clockIn: '2025-06-05T09:15:00Z',
          clockOut: '2025-06-05T18:45:00Z',
          workHours: 8.5,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-06',
          clockIn: '2025-06-06T09:00:00Z',
          clockOut: '2025-06-06T18:30:00Z',
          workHours: 8.0,
          breakTime: 60,
          status: 'PENDING',
          notes: null
        }
      ]
    },
    {
      user: {
        firstName: '健一',
        lastName: '鈴木'
      },
      totalHours: 144.0,
      timeEntries: [
        {
          date: '2025-06-02',
          clockIn: '2025-06-02T09:30:00Z',
          clockOut: '2025-06-02T18:30:00Z',
          workHours: 8.0,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-03',
          clockIn: '2025-06-03T09:15:00Z',
          clockOut: '2025-06-03T18:45:00Z',
          workHours: 8.5,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-04',
          clockIn: '2025-06-04T09:00:00Z',
          clockOut: '2025-06-04T17:30:00Z',
          workHours: 7.5,
          breakTime: 60,
          status: 'APPROVED',
          notes: '早退（体調不良）'
        },
        {
          date: '2025-06-05',
          clockIn: '2025-06-05T09:45:00Z',
          clockOut: '2025-06-05T18:15:00Z',
          workHours: 7.5,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        },
        {
          date: '2025-06-06',
          clockIn: '2025-06-06T09:00:00Z',
          clockOut: '2025-06-06T18:00:00Z',
          workHours: 8.0,
          breakTime: 60,
          status: 'APPROVED',
          notes: null
        }
      ]
    }
  ]
};

async function testProjectPDFGeneration() {
  try {
    console.log('プロジェクト全体勤怠記録PDF生成テスト開始...');
    console.log(`プロジェクト: ${projectTestData.project.name}`);
    console.log(`期間: ${projectTestData.period.year}年${projectTestData.period.month}月`);
    console.log(`メンバー数: ${projectTestData.members.length}名`);
    
    const pdfBuffer = await PDFGenerator.generateProjectPDF(projectTestData);
    
    // PDF を /tmp/project-timesheet.pdf として保存
    fs.writeFileSync('/tmp/project-timesheet.pdf', pdfBuffer);
    
    console.log('プロジェクト全体勤怠記録PDF生成完了！');
    console.log('PDFは /tmp/project-timesheet.pdf に保存されました');
    console.log(`PDFサイズ: ${pdfBuffer.length} bytes`);
    
    // メンバー別総労働時間を表示
    projectTestData.members.forEach(member => {
      console.log(`${member.user.lastName} ${member.user.firstName}: ${member.totalHours}時間`);
    });
    
  } catch (error) {
    console.error('プロジェクト全体勤怠記録PDF生成でエラーが発生:', error);
  }
}

testProjectPDFGeneration();
