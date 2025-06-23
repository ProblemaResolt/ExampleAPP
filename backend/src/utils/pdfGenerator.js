const PDFDocument = require('pdfkit');
const fs = require('fs');

class PDFGenerator {  /**
   * 日本語フォントを設定する
   */
  static setupJapaneseFont(doc) {
    try {
      // Dockerコンテナ内で利用可能な日本語フォントパスを試行
      const fontPaths = [
        '/usr/share/fonts/ipafont/ipag.ttf',      // IPA Gothic (日本語ゴシック体)
        '/usr/share/fonts/ipafont/ipam.ttf',      // IPA Mincho (日本語明朝体) 
        '/usr/share/fonts/ipafont/ipagp.ttf',     // IPA Gothic P
        '/usr/share/fonts/ipafont/ipamp.ttf',     // IPA Mincho P
        '/usr/share/fonts/dejavu/DejaVuSans.ttf'  // フォールバック
      ];

      // システムにインストールされている日本語フォント名を試行
      const fontNames = [
        'IPA Gothic',
        'IPA Mincho',
        'Noto Sans CJK JP',
        'Noto Serif CJK JP'
      ];

      // まずフォント名で直接指定を試行
      for (const fontName of fontNames) {
        try {
          doc.font(fontName);
          console.log(`システム日本語フォント（${fontName}）を使用`);
          return true;
        } catch (e) {
          console.log(`フォント名 ${fontName} の設定に失敗: ${e.message}`);
          continue;
        }
      }

      // フォントファイルパスで指定を試行
      for (const fontPath of fontPaths) {
        try {
          if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
            console.log(`日本語フォントファイル（${fontPath}）を使用`);
            return true;
          } else {
            console.log(`フォントファイルが存在しません: ${fontPath}`);
          }
        } catch (e) {
          console.log(`フォントファイル ${fontPath} の読み込みに失敗: ${e.message}`);
          continue;
        }
      }

      // どのフォントも利用できない場合はデフォルト
      console.warn('日本語フォントが見つかりません。デフォルトフォントを使用（日本語文字が正しく表示されない可能性があります）');
      doc.font('Helvetica');
      return false;

    } catch (error) {
      console.error('フォント設定エラー:', error.message);
      doc.font('Helvetica');
      return false;
    }
  }
  /**
   * プロジェクト全体の勤怠記録PDFを生成
   */
  static async generateProjectPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers = [];
        doc.on('data', (buffer) => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // 日本語フォント設定
        this.setupJapaneseFont(doc);

        // ヘッダー
        doc.fontSize(18).text(`${data.project.name} - 勤怠記録`, { align: 'center' });
        doc.fontSize(12).text(`${data.period.year}年${data.period.month}月`, { align: 'center' });
        doc.moveDown(2);

        // 各メンバーの詳細勤怠記録
        data.members.forEach((member, memberIndex) => {
          // 新しいメンバーの場合はページを分ける（最初のメンバー以外）
          if (memberIndex > 0) {
            doc.addPage();
            this.setupJapaneseFont(doc);
          }

          // メンバー情報
          doc.fontSize(16).text(`${member.user.lastName} ${member.user.firstName}`, { underline: true });
          doc.fontSize(12);
          doc.text(`総労働日数: ${member.timeEntries ? member.timeEntries.length : 0}日`);
          doc.text(`総労働時間: ${member.totalHours ? member.totalHours.toFixed(1) : '0.0'}時間`);
          doc.moveDown();

          // 日別勤怠記録テーブル
          doc.fontSize(14).text('日別勤怠記録');
          doc.moveDown(0.5);

          // テーブルヘッダー
          const tableTop = doc.y;
          const rowHeight = 20;
          let currentY = tableTop;

          // ヘッダー行
          doc.fontSize(10);
          doc.text('日付', 50, currentY, { width: 60 });
          doc.text('出勤', 110, currentY, { width: 50 });
          doc.text('退勤', 160, currentY, { width: 50 });
          doc.text('労働時間', 210, currentY, { width: 50 });
          doc.text('休憩', 260, currentY, { width: 40 });
          doc.text('状態', 300, currentY, { width: 60 });
          doc.text('備考', 360, currentY, { width: 100 });

          currentY += rowHeight;

          // ヘッダー罫線
          doc.rect(50, tableTop, 450, rowHeight).stroke();

          // データ行
          if (member.timeEntries && member.timeEntries.length > 0) {
            member.timeEntries.forEach((entry, index) => {
              // ページの境界チェック
              if (currentY > 700) {
                doc.addPage();
                this.setupJapaneseFont(doc);
                currentY = 50;
                
                // 新しいページでのヘッダー再描画
                doc.fontSize(10);
                doc.text('日付', 50, currentY, { width: 60 });
                doc.text('出勤', 110, currentY, { width: 50 });
                doc.text('退勤', 160, currentY, { width: 50 });
                doc.text('労働時間', 210, currentY, { width: 50 });
                doc.text('休憩', 260, currentY, { width: 40 });
                doc.text('状態', 300, currentY, { width: 60 });
                doc.text('備考', 360, currentY, { width: 100 });
                doc.rect(50, currentY, 450, rowHeight).stroke();
                currentY += rowHeight;
              }

              const date = new Date(entry.date);
              doc.text(`${date.getMonth() + 1}/${date.getDate()}`, 50, currentY, { width: 60 });
              doc.text(entry.clockIn ? this.formatTime(entry.clockIn) : '-', 110, currentY, { width: 50 });
              doc.text(entry.clockOut ? this.formatTime(entry.clockOut) : '-', 160, currentY, { width: 50 });
              doc.text(entry.workHours ? `${entry.workHours.toFixed(1)}h` : '-', 210, currentY, { width: 50 });
              doc.text(entry.breakTime ? `${entry.breakTime}分` : '-', 260, currentY, { width: 40 });
              doc.text(this.getStatusText(entry.status), 300, currentY, { width: 60 });
              doc.text(entry.notes || '-', 360, currentY, { width: 100 });

              // 行の罫線
              doc.rect(50, currentY, 450, rowHeight).stroke();
              currentY += rowHeight;
            });
          } else {
            // 勤怠データがない場合
            doc.text('勤怠データなし', 50, currentY, { width: 450, align: 'center' });
            doc.rect(50, currentY, 450, rowHeight).stroke();
            currentY += rowHeight;
          }
        });

        // フッター
        doc.fontSize(10).text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, 50, 750);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * 個人の勤怠記録PDFを生成
   */
  static async generateMemberPDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers = [];
        doc.on('data', (buffer) => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // 日本語フォント設定
        this.setupJapaneseFont(doc);

        // ヘッダー
        doc.fontSize(18).text('勤怠記録表', { align: 'center' });
        doc.moveDown();

        // 個人情報
        doc.fontSize(12);
        doc.text(`氏名: ${data.user.lastName} ${data.user.firstName}`);
        doc.text(`期間: ${data.period.year}年${data.period.month}月`);
        doc.text(`総労働日数: ${data.timeEntries.length}日`);
        doc.text(`総労働時間: ${data.timeEntries.reduce((sum, entry) => sum + (entry.workHours || 0), 0).toFixed(1)}時間`);
        doc.moveDown();

        // 日別勤怠記録
        doc.fontSize(14).text('日別勤怠記録', { underline: true });
        doc.moveDown();

        // テーブルヘッダー
        const tableTop = doc.y;
        const rowHeight = 20;
        let currentY = tableTop;

        // ヘッダー行
        doc.fontSize(10);
        doc.text('日付', 50, currentY, { width: 60 });
        doc.text('出勤', 110, currentY, { width: 50 });
        doc.text('退勤', 160, currentY, { width: 50 });
        doc.text('労働時間', 210, currentY, { width: 50 });
        doc.text('休憩', 260, currentY, { width: 40 });
        doc.text('状態', 300, currentY, { width: 60 });
        doc.text('備考', 360, currentY, { width: 100 });

        currentY += rowHeight;

        // 罫線
        doc.rect(50, tableTop, 450, rowHeight).stroke();

        // データ行
        data.timeEntries.forEach((entry, index) => {
          if (currentY > 700) {
            doc.addPage();
            this.setupJapaneseFont(doc);
            currentY = 50;
          }

          const date = new Date(entry.date);
          doc.text(`${date.getMonth() + 1}/${date.getDate()}`, 50, currentY, { width: 60 });
          doc.text(entry.clockIn ? this.formatTime(entry.clockIn) : '-', 110, currentY, { width: 50 });
          doc.text(entry.clockOut ? this.formatTime(entry.clockOut) : '-', 160, currentY, { width: 50 });
          doc.text(entry.workHours ? `${entry.workHours.toFixed(1)}h` : '-', 210, currentY, { width: 50 });
          doc.text(entry.breakTime ? `${entry.breakTime}分` : '-', 260, currentY, { width: 40 });
          doc.text(this.getStatusText(entry.status), 300, currentY, { width: 60 });
          doc.text(entry.notes || '-', 360, currentY, { width: 100 });

          // 罫線
          doc.rect(50, currentY, 450, rowHeight).stroke();
          currentY += rowHeight;
        });

        // フッター
        doc.fontSize(10).text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, 50, 750);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static formatTime(timeString) {
    if (!timeString) return '-';
    const date = new Date(timeString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  static getStatusText(status) {
    switch (status) {
      case 'APPROVED': return '承認済み';
      case 'PENDING': return '承認待ち';
      case 'REJECTED': return '却下';
      default: return '未設定';
    }
  }
}

module.exports = PDFGenerator;
