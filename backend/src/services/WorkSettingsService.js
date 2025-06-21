const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 勤怠設定サービス
 */
class WorkSettingsService {
  /**
   * 休憩プリセットを取得
   */
  static async getBreakPresets(userId, userRole, companyId) {
    const where = {};
    
    if (userRole === 'ADMIN') {
      // 管理者はすべてのプリセットを表示
    } else if (userRole === 'COMPANY') {
      // 会社管理者は自社のプリセットのみ
      where.companyId = companyId;
    } else {
      // 一般ユーザーは自社のプリセットのみ
      where.companyId = companyId;
    }

    const presets = await prisma.breakPreset.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return presets;
  }

  /**
   * 休憩プリセットを作成
   */
  static async createBreakPreset(userId, userRole, companyId, { name, duration, type = 'BREAK' }) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('休憩プリセットの作成権限がありません', 403);
    }

    const preset = await prisma.breakPreset.create({
      data: {
        name,
        duration: parseInt(duration),
        type,
        companyId: userRole === 'ADMIN' ? companyId : companyId
      }
    });

    return preset;
  }

  /**
   * 休憩プリセットを削除
   */
  static async deleteBreakPreset(userId, userRole, companyId, presetId) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('休憩プリセットの削除権限がありません', 403);
    }

    const preset = await prisma.breakPreset.findUnique({
      where: { id: presetId }
    });

    if (!preset) {
      throw new AppError('休憩プリセットが見つかりません', 404);
    }

    if (userRole === 'COMPANY' && preset.companyId !== companyId) {
      throw new AppError('他社の休憩プリセットは削除できません', 403);
    }

    await prisma.breakPreset.delete({
      where: { id: presetId }
    });

    return { message: '休憩プリセットを削除しました' };
  }

  /**
   * ユーザーの勤務設定を取得
   */
  static async getUserWorkSettings(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workSettings: true,
        company: {
          select: {
            id: true,
            name: true,
            workSettings: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // ユーザー個別設定がない場合は会社のデフォルト設定を使用
    const workSettings = user.workSettings || user.company?.workSettings || {
      workStartTime: '09:00',
      workEndTime: '18:00',
      breakDuration: 60,
      flexTime: false,
      overtime: false
    };

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      workSettings,
      company: user.company
    };
  }

  /**
   * ユーザーの勤務設定を更新
   */
  static async updateUserWorkSettings(userId, userRole, targetUserId, settings) {
    // 権限チェック
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY' && userId !== targetUserId) {
      throw new AppError('他のユーザーの設定を変更する権限がありません', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { workSettings: true }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    let workSettings;
    if (user.workSettings) {
      // 既存設定を更新
      workSettings = await prisma.workSettings.update({
        where: { userId: targetUserId },
        data: settings
      });
    } else {
      // 新規設定を作成
      workSettings = await prisma.workSettings.create({
        data: {
          ...settings,
          userId: targetUserId
        }
      });
    }

    return workSettings;
  }

  /**
   * 会社の全ユーザーの勤務設定を取得（管理者用）
   */
  static async getUsersWorkSettings(userId, userRole, companyId) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('ユーザー設定一覧の閲覧権限がありません', 403);
    }

    const where = {};
    if (userRole === 'COMPANY') {
      where.companyId = companyId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        workSettings: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { company: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return users;
  }

  /**
   * 複数ユーザーの勤務設定を一括更新
   */
  static async bulkUpdateWorkSettings(userId, userRole, companyId, { userIds, settings }) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('一括設定変更の権限がありません', 403);
    }

    const where = { id: { in: userIds } };
    if (userRole === 'COMPANY') {
      where.companyId = companyId;
    }

    // 対象ユーザーの存在確認
    const users = await prisma.user.findMany({
      where,
      include: { workSettings: true }
    });

    if (users.length !== userIds.length) {
      throw new AppError('一部のユーザーが見つかりません', 404);
    }

    const results = [];
    for (const user of users) {
      let workSettings;
      if (user.workSettings) {
        workSettings = await prisma.workSettings.update({
          where: { userId: user.id },
          data: settings
        });
      } else {
        workSettings = await prisma.workSettings.create({
          data: {
            ...settings,
            userId: user.id
          }
        });
      }
      results.push({
        userId: user.id,
        userName: `${user.lastName} ${user.firstName}`,
        workSettings
      });
    }

    return {
      updatedCount: results.length,
      results
    };
  }

  /**
   * 会社のデフォルト設定を取得
   */
  static async getCompanyDefaultSettings(userId, userRole, companyId) {
    if (userRole !== 'ADMIN' && userRole !== 'COMPANY') {
      throw new AppError('会社設定の閲覧権限がありません', 403);
    }

    const where = {};
    if (userRole === 'COMPANY') {
      where.id = companyId;
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        workSettings: true
      },
      orderBy: { name: 'asc' }
    });

    return companies;
  }
}

module.exports = WorkSettingsService;
