const ExcelJS = require('exceljs');

/**
 * Excel生成ユーティリティ
 */
class ExcelGenerator {
  /**
   * プロジェクト全体の勤怠データをExcelファイルとして生成
   */
  static async generateProjectExcel(projectData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${projectData.project.name}_勤怠記録`);

    // ヘッダー情報
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${projectData.project.name} - ${projectData.period.year}年${projectData.period.month}月 勤怠記録`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `作成日: ${new Date().toLocaleDateString('ja-JP')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    let currentRow = 4;

    // 各メンバーのデータを追加
    for (const memberData of projectData.memberData) {
      const user = memberData.user;
      const timeEntries = memberData.timeEntries;

      // メンバー名
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `${user.firstName} ${user.lastName} (${user.email})`;
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      currentRow++;

      // 統計情報
      const totalWorkHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const approvedCount = timeEntries.filter(entry => entry.status === 'APPROVED').length;
      
      worksheet.getCell(`A${currentRow}`).value = `総労働時間: ${totalWorkHours.toFixed(1)}時間`;
      worksheet.getCell(`D${currentRow}`).value = `承認済み: ${approvedCount}件`;
      worksheet.getCell(`F${currentRow}`).value = `総記録: ${timeEntries.length}件`;
      currentRow++;

      // ヘッダー行
      const headers = ['日付', '出勤時刻', '退勤時刻', '労働時間', '休憩時間', 'ステータス', 'プロジェクト', '備考'];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      currentRow++;

      // データ行
      timeEntries.forEach(entry => {
        const rowData = [
          new Date(entry.date).toLocaleDateString('ja-JP'),
          entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
          entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
          entry.workHours ? `${entry.workHours.toFixed(1)}h` : '-',
          entry.breakTime ? `${entry.breakTime}分` : '-',
          entry.status === 'APPROVED' ? '承認済み' : entry.status === 'PENDING' ? '承認待ち' : '却下',
          entry.workReports && entry.workReports.length > 0 ? 
            entry.workReports.map(report => report.project?.name).join(', ') : '-',
          entry.notes || '-'
        ];

        rowData.forEach((data, index) => {
          const cell = worksheet.getCell(currentRow, index + 1);
          cell.value = data;
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        currentRow++;
      });

      currentRow += 2; // 空行を追加
    }

    // 列幅の調整
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    worksheet.getColumn(1).width = 12; // 日付
    worksheet.getColumn(8).width = 25; // 備考

    return workbook;
  }

  /**
   * 個人の勤怠データをExcelファイルとして生成
   */
  static async generateMemberExcel(memberData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('個人勤怠記録');

    const user = memberData.user;
    const timeEntries = memberData.timeEntries;
    const period = memberData.period;

    // ヘッダー情報
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${user.firstName} ${user.lastName} - ${period.year}年${period.month}月 勤怠記録`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `作成日: ${new Date().toLocaleDateString('ja-JP')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // 統計情報
    const totalWorkHours = timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    const approvedCount = timeEntries.filter(entry => entry.status === 'APPROVED').length;
    const pendingCount = timeEntries.filter(entry => entry.status === 'PENDING').length;

    worksheet.getCell('A4').value = `総労働時間: ${totalWorkHours.toFixed(1)}時間`;
    worksheet.getCell('D4').value = `承認済み: ${approvedCount}件`;
    worksheet.getCell('F4').value = `承認待ち: ${pendingCount}件`;
    worksheet.getCell('H4').value = `総記録: ${timeEntries.length}件`;

    // ヘッダー行
    const headers = ['日付', '出勤時刻', '退勤時刻', '労働時間', '休憩時間', 'ステータス', 'プロジェクト', '備考'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(6, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // データ行
    timeEntries.forEach((entry, index) => {
      const row = 7 + index;
      const rowData = [
        new Date(entry.date).toLocaleDateString('ja-JP'),
        entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
        entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
        entry.workHours ? `${entry.workHours.toFixed(1)}h` : '-',
        entry.breakTime ? `${entry.breakTime}分` : '-',
        entry.status === 'APPROVED' ? '承認済み' : entry.status === 'PENDING' ? '承認待ち' : '却下',
        entry.workReports && entry.workReports.length > 0 ? 
          entry.workReports.map(report => report.project?.name).join(', ') : '-',
        entry.notes || '-'
      ];

      rowData.forEach((data, columnIndex) => {
        const cell = worksheet.getCell(row, columnIndex + 1);
        cell.value = data;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 列幅の調整
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    worksheet.getColumn(1).width = 12; // 日付
    worksheet.getColumn(8).width = 25; // 備考

    return workbook;
  }
}

module.exports = ExcelGenerator;
