const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 勤怠承認サービス
 */
class ApprovalService {
  /**
   * 承認待ちの勤怠記録を取得
   */
  static async getPendingApprovals(companyId, { page = 1, limit = 10, status, userId, startDate, endDate }) {
    const skip = (page - 1) * limit;
    
    const whereConditions = {
      user: {
        companyId: companyId
      }
    };

    if (status) {
      whereConditions.status = status;
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    if (startDate && endDate) {
      whereConditions.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          workReports: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.timeEntry.count({
        where: whereConditions
      })
    ]);

    return {
      entries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 勤怠記録を承認
   */
  static async approveTimeEntry(timeEntryId, approverId) {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    // 承認者が同じ会社に所属しているかチェック
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || approver.companyId !== timeEntry.user.companyId) {
      throw new AppError('承認権限がありません', 403);
    }

    if (!['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    if (timeEntry.status === 'APPROVED') {
      throw new AppError('既に承認済みです', 400);
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date()
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updatedTimeEntry;
  }

  /**
   * 勤怠記録を却下
   */
  static async rejectTimeEntry(timeEntryId, approverId, reason) {
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!timeEntry) {
      throw new AppError('勤怠記録が見つかりません', 404);
    }

    // 承認者が同じ会社に所属しているかチェック
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || approver.companyId !== timeEntry.user.companyId) {
      throw new AppError('承認権限がありません', 403);
    }

    if (!['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    if (timeEntry.status === 'REJECTED') {
      throw new AppError('既に却下済みです', 400);
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        status: 'REJECTED',
        rejectedBy: approverId,
        rejectedAt: new Date(),
        rejectionReason: reason
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updatedTimeEntry;
  }

  /**
   * 一括承認
   */
  static async bulkApprove(timeEntryIds, approverId) {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { companyId: true, role: true }
    });

    if (!approver || !['MANAGER', 'COMPANY'].includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    // 対象の勤怠記録が全て同じ会社に所属しているかチェック
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        id: { in: timeEntryIds },
        user: {
          companyId: approver.companyId
        }
      }
    });

    if (timeEntries.length !== timeEntryIds.length) {
      throw new AppError('承認対象に無効な記録が含まれています', 400);
    }

    const updatedTimeEntries = await prisma.timeEntry.updateMany({
      where: {
        id: { in: timeEntryIds },
        status: 'PENDING'
      },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date()
      }
    });

    return updatedTimeEntries;
  }
}

module.exports = ApprovalService;
