const PDFGenerator = require('./src/utils/pdfGenerator');
const fs = require('fs');

// 個人の勤務表テスト用データ
const memberTestData = {
  user: {
    firstName: '太郎',
    lastName: '田中'
  },
  period: {
    year: 2025,
    month: 6
  },
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
      status: 'APPROVED',
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
    },
    {
      date: '2025-06-09',
      clockIn: '2025-06-09T09:56:00Z',
      clockOut: '2025-06-09T18:19:00Z',
      workHours: 7.4,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-10',
      clockIn: '2025-06-10T09:25:00Z',
      clockOut: '2025-06-10T18:31:00Z',
      workHours: 8.1,
      breakTime: 60,
      status: 'PENDING',
      notes: null
    },
    {
      date: '2025-06-11',
      clockIn: '2025-06-11T09:33:00Z',
      clockOut: '2025-06-11T18:45:00Z',
      workHours: 8.2,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-12',
      clockIn: '2025-06-12T09:00:00Z',
      clockOut: '2025-06-12T18:00:00Z',
      workHours: 8.0,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-13',
      clockIn: '2025-06-13T09:27:00Z',
      clockOut: '2025-06-13T18:51:00Z',
      workHours: 8.4,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-16',
      clockIn: '2025-06-16T09:59:00Z',
      clockOut: '2025-06-16T18:09:00Z',
      workHours: 7.2,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-17',
      clockIn: '2025-06-17T09:54:00Z',
      clockOut: '2025-06-17T18:51:00Z',
      workHours: 8.0,
      breakTime: 60,
      status: 'PENDING',
      notes: null
    },
    {
      date: '2025-06-18',
      clockIn: '2025-06-18T09:10:00Z',
      clockOut: '2025-06-18T18:41:00Z',
      workHours: 8.5,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-19',
      clockIn: '2025-06-19T09:50:00Z',
      clockOut: '2025-06-19T18:17:00Z',
      workHours: 7.5,
      breakTime: 60,
      status: 'APPROVED',
      notes: null
    },
    {
      date: '2025-06-20',
      clockIn: '2025-06-20T09:17:00Z',
      clockOut: '2025-06-20T18:33:00Z',
      workHours: 8.3,
      breakTime: 60,
      status: 'PENDING',
      notes: null
    }
  ]
};

async function testMemberPDFGeneration() {
  try {
    console.log('個人勤務表PDF生成テスト開始...');
    console.log(`対象者: ${memberTestData.user.lastName} ${memberTestData.user.firstName}`);
    console.log(`期間: ${memberTestData.period.year}年${memberTestData.period.month}月`);
    console.log(`総勤務日数: ${memberTestData.timeEntries.length}日`);
    
    const pdfBuffer = await PDFGenerator.generateMemberPDF(memberTestData);
    
    // PDF を /tmp/member-timesheet.pdf として保存
    fs.writeFileSync('/tmp/member-timesheet.pdf', pdfBuffer);
    
    console.log('個人勤務表PDF生成完了！');
    console.log('PDFは /tmp/member-timesheet.pdf に保存されました');
    console.log(`PDFサイズ: ${pdfBuffer.length} bytes`);
    
    // 総労働時間を計算
    const totalHours = memberTestData.timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    console.log(`総労働時間: ${totalHours.toFixed(1)}時間`);
    
  } catch (error) {
    console.error('個人勤務表PDF生成でエラーが発生:', error);
  }
}

testMemberPDFGeneration();
