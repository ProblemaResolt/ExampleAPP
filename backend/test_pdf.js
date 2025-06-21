const PDFGenerator = require('./src/utils/pdfGenerator');
const fs = require('fs');

// テスト用のダミーデータ
const testData = {
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
      date: '2025-06-01',
      clockIn: '2025-06-01T09:00:00Z',
      clockOut: '2025-06-01T18:00:00Z',
      workHours: 8.0,
      breakTime: 60,
      status: 'APPROVED',
      notes: 'テスト備考'
    }
  ]
};

async function testPDF() {
  try {
    console.log('PDF生成テストを開始...');
    const pdfBuffer = await PDFGenerator.generateMemberPDF(testData);
    
    // PDFファイルを保存
    fs.writeFileSync('./test_output.pdf', pdfBuffer);
    console.log('PDF生成完了: test_output.pdf');
    
    // ファイルサイズを確認
    const stats = fs.statSync('./test_output.pdf');
    console.log(`ファイルサイズ: ${stats.size} bytes`);
    
  } catch (error) {
    console.error('PDF生成エラー:', error);
  }
}

testPDF();
