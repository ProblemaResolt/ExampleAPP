const PDFGenerator = require('./src/utils/pdfGenerator');
const fs = require('fs');

// テスト用データ
const testData = {
  project: {
    name: 'テストプロジェクト 日本語',
  },
  period: {
    year: 2024,
    month: 6
  },
  members: [
    {
      user: {
        firstName: '太郎',
        lastName: '田中'
      },
      workDays: 20,
      totalHours: 160.5,
      approvedCount: 18,
      pendingCount: 2
    },
    {
      user: {
        firstName: '花子',
        lastName: '佐藤'
      },
      workDays: 18,
      totalHours: 144.0,
      approvedCount: 16,
      pendingCount: 2
    }
  ]
};

async function testPDFGeneration() {
  try {
    console.log('PDF生成テスト開始...');
    
    const pdfBuffer = await PDFGenerator.generateProjectPDF(testData);
    
    // PDF を /tmp/test-japanese.pdf として保存
    fs.writeFileSync('/tmp/test-japanese.pdf', pdfBuffer);
    
    console.log('PDF生成テスト完了！');
    console.log('PDFは /tmp/test-japanese.pdf に保存されました');
    console.log(`PDFサイズ: ${pdfBuffer.length} bytes`);
    
  } catch (error) {
    console.error('PDF生成テストでエラーが発生:', error);
  }
}

testPDFGeneration();
