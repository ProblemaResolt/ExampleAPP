const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');
const ExcelJS = require('exceljs');

/**
 * 勤怠エントリサービス
 */
class AttendanceEntryService {  /**
   * 勤怠記録一覧を取得
   */
  static async getEntries(userId, userRole, { page = 1, limit = 50, startDate, endDate, status, userFilter }) {
    const offset = (page - 1) * limit;
    const where = {};

    // ロール別のアクセス制御
    if (userRole === 'ADMIN') {
      // 管理者は全てのデータにアクセス可能
      if (userFilter) {
        where.userId = userFilter;
      }
    } else if (userRole === 'COMPANY' || userRole === 'MANAGER') {
      // COMPANYまたはMANAGERロールは自分の会社のメンバーのみアクセス可能
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        throw new AppError('会社情報が設定されていません', 403);
      }

      where.user = {
        companyId: currentUser.companyId
      };

      if (userFilter) {
        where.userId = userFilter;
      }
    } else {
      // MEMBERは自分の記録のみ
      where.userId = userId;
    }

    // 日付範囲フィルタ
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // ステータスフィルタ
    if (status) {
      where.status = status;
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          breakEntries: true,
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.timeEntry.count({ where })
    ]);

    return {
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 月次レポートを取得
   */
  static async getMonthlyReport(userId, userRole, { year, month, userFilter }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };    // ロール別のアクセス制御
    if (userRole === 'ADMIN') {
      // 管理者は全てのデータにアクセス可能
      if (userFilter) {
        where.userId = userFilter;
      }
    } else if (userRole === 'COMPANY' || userRole === 'MANAGER') {
      // COMPANYまたはMANAGERロールは自分の会社のメンバーのみアクセス可能
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        throw new AppError('会社情報が設定されていません', 403);
      }

      where.user = {
        companyId: currentUser.companyId
      };

      if (userFilter) {
        where.userId = userFilter;
      }
    } else {
      // MEMBERは自分の記録のみ
      where.userId = userId;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,            firstName: true,
            lastName: true
          }
        },
        breakEntries: true
      },
      orderBy: { date: 'asc' }
    });

    // 統計情報を計算
    const totalWorkHours = entries.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
    const totalWorkDays = entries.filter(entry => entry.clockIn && entry.clockOut).length;
    const averageWorkHours = totalWorkDays > 0 ? totalWorkHours / totalWorkDays : 0;

    const statusCounts = entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});

    return {
      entries,
      summary: {
        period: { year: parseInt(year), month: parseInt(month) },
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        totalWorkDays,
        averageWorkHours: parseFloat(averageWorkHours.toFixed(2)),
        statusCounts
      }
    };
  }

  /**
   * 月別勤怠データを取得（詳細版）
   */
  static async getMonthlyData(userId, userRole, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where = {
      date: {
        gte: startDate,
        lte: endDate
      }
    };    // ロール別のアクセス制御
    if (userRole === 'ADMIN') {
      // 管理者は全てのデータにアクセス可能
    } else if (userRole === 'COMPANY' || userRole === 'MANAGER') {
      // COMPANYまたはMANAGERロールは自分の会社のメンバーのみアクセス可能
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });

      if (!currentUser?.companyId) {
        throw new AppError('会社情報が設定されていません', 403);
      }

      where.user = {
        companyId: currentUser.companyId
      };
    } else {
      // MEMBERは自分の記録のみ
      where.userId = userId;
    }

    const attendanceData = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,            workSettings: true
          }
        },
        breakEntries: true,
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' }
      ]
    });

    // ユーザー別にグループ化
    const userGroups = attendanceData.reduce((acc, entry) => {
      const userId = entry.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          entries: []
        };
      }
      acc[userId].entries.push(entry);
      return acc;
    }, {});

    // 各ユーザーの統計を計算
    const usersWithStats = Object.values(userGroups).map(group => {
      const { user, entries } = group;
      
      const workDays = entries.filter(entry => entry.clockIn && entry.clockOut);
      const totalWorkHours = workDays.reduce((sum, entry) => sum + (entry.workHours || 0), 0);
      const approvedCount = entries.filter(entry => entry.status === 'APPROVED').length;
      const pendingCount = entries.filter(entry => entry.status === 'PENDING').length;
      const rejectedCount = entries.filter(entry => entry.status === 'REJECTED').length;

      return {
        user,
        stats: {
          totalEntries: entries.length,
          workDays: workDays.length,
          totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
          averageWorkHours: workDays.length > 0 ? parseFloat((totalWorkHours / workDays.length).toFixed(2)) : 0,
          approvedCount,
          pendingCount,
          rejectedCount
        },
        entries
      };
    });

    return {
      period: { year: parseInt(year), month: parseInt(month) },
      users: usersWithStats,
      summary: {
        totalUsers: usersWithStats.length,
        totalEntries: attendanceData.length,
        totalWorkHours: usersWithStats.reduce((sum, user) => sum + user.stats.totalWorkHours, 0)
      }
    };
  }


  /**
   * 勤怠記録をExcel形式でエクスポート
   */
  static async exportToExcel(userId, userRole, { year, month, userFilter, format = 'monthly' }) {
    try {
      let data;
      let filename;
      
      if (format === 'monthly') {
        data = await this.getMonthlyReport(userId, userRole, { year, month, userFilter });
        filename = `勤怠記録_${year}年${month}月`;
        if (userFilter) {
          const user = await prisma.user.findUnique({
            where: { id: userFilter },
            select: { firstName: true, lastName: true }
          });
          if (user) {
            filename += `_${user.lastName}${user.firstName}`;
          }
        }
      } else {
        throw new AppError('Unsupported export format', 400);
      }

      // Excelワークブックを作成
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('勤怠記録');

      // ヘッダー設定
      const headers = [
        '日付',
        '社員名',
        '出勤時間',
        '退勤時間',
        '休憩時間',
        '実働時間',
        'ステータス',
        '承認者',
        '備考'
      ];

      // ヘッダー行を追加
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // データ行を追加
      data.entries.forEach(entry => {
        const breakTime = entry.breakEntries?.reduce((total, br) => {
          if (br.breakStart && br.breakEnd) {
            const start = new Date(br.breakStart);
            const end = new Date(br.breakEnd);
            return total + (end - start) / (1000 * 60); // 分単位
          }
          return total;
        }, 0) || 0;

        const row = [
          entry.date ? new Date(entry.date).toLocaleDateString('ja-JP') : '',
          `${entry.user?.lastName || ''} ${entry.user?.firstName || ''}`.trim(),
          entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '',
          entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '',
          breakTime > 0 ? `${Math.floor(breakTime / 60)}時間${breakTime % 60}分` : '',
          entry.workHours ? `${entry.workHours}時間` : '',
          this._getStatusText(entry.status),
          entry.approver ? `${entry.approver.lastName} ${entry.approver.firstName}`.trim() : '',
          entry.note || ''
        ];
        
        worksheet.addRow(row);
      });

      // 列幅を自動調整
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // サマリー情報を追加
      if (data.summary) {
        worksheet.addRow([]); // 空行
        worksheet.addRow(['集計情報']);
        worksheet.addRow(['期間', `${data.summary.period.year}年${data.summary.period.month}月`]);
        worksheet.addRow(['総実働時間', `${data.summary.totalWorkHours}時間`]);
        worksheet.addRow(['総勤務日数', `${data.summary.totalWorkDays}日`]);
        worksheet.addRow(['平均実働時間', `${data.summary.averageWorkHours}時間`]);
        
        if (data.summary.statusCounts) {
          worksheet.addRow([]); // 空行
          worksheet.addRow(['ステータス別集計']);
          Object.entries(data.summary.statusCounts).forEach(([status, count]) => {
            worksheet.addRow([this._getStatusText(status), `${count}件`]);
          });
        }
      }

      // Excelファイルをバッファとして生成
      const buffer = await workbook.xlsx.writeBuffer();
      
      return {
        buffer,
        filename: `${filename}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      console.error('Excel export error:', error);
      throw new AppError('Excelエクスポートに失敗しました', 500);
    }
  }

  /**
   * ステータステキストを取得
   */
  static _getStatusText(status) {
    const statusMap = {
      'PENDING': '承認待ち',
      'APPROVED': '承認済み',
      'REJECTED': '却下',
      'DRAFT': '下書き'
    };
    return statusMap[status] || status;
  }
}

module.exports = AttendanceEntryService;
