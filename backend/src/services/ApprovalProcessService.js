const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error');

/**
 * 承認プロセス共通サービス
 * 各種エンティティの承認処理に共通する機能を提供
 */
class ApprovalProcessService {
  /**
   * 承認ステータス定数
   */
  static STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DRAFT: 'DRAFT'
  };

  /**
   * 承認可能なロール
   */
  static APPROVER_ROLES = ['MANAGER', 'COMPANY', 'ADMIN'];

  /**
   * 承認者の権限をチェック
   * @param {string} approverId - 承認者のID
   * @param {string} targetCompanyId - 対象の会社ID（オプション）
   * @returns {Promise<Object>} 承認者情報
   */
  static async validateApprover(approverId, targetCompanyId = null) {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { 
        id: true,
        companyId: true, 
        role: true,
        firstName: true,
        lastName: true
      }
    });

    if (!approver) {
      throw new AppError('承認者が見つかりません', 404);
    }

    if (!this.APPROVER_ROLES.includes(approver.role)) {
      throw new AppError('承認権限がありません', 403);
    }

    // 会社IDのチェック（ADMINは除く）
    if (targetCompanyId && approver.role !== 'ADMIN' && approver.companyId !== targetCompanyId) {
      throw new AppError('異なる会社のデータを承認することはできません', 403);
    }

    return approver;
  }

  /**
   * エンティティの会社所属をチェック
   * @param {string} entityType - エンティティタイプ ('timeEntry', 'leaveRequest', etc.)
   * @param {string} entityId - エンティティID
   * @param {string} approverId - 承認者ID
   * @returns {Promise<Object>} エンティティ情報
   */
  static async validateEntityAccess(entityType, entityId, approverId) {
    const approver = await this.validateApprover(approverId);

    let entity;
    
    switch (entityType) {
      case 'timeEntry':
        entity = await prisma.timeEntry.findUnique({
          where: { id: entityId },
          include: {
            user: {
              select: {
                id: true,
                companyId: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
        break;
      
      case 'leaveRequest':
        entity = await prisma.leaveRequest.findUnique({
          where: { id: entityId },
          include: {
            user: {
              select: {
                id: true,
                companyId: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
        break;

      default:
        throw new AppError('サポートされていないエンティティタイプです', 400);
    }

    if (!entity) {
      throw new AppError('対象のデータが見つかりません', 404);
    }

    // 会社所属チェック（ADMINは除く）
    if (approver.role !== 'ADMIN' && approver.companyId !== entity.user.companyId) {
      throw new AppError('異なる会社のデータを承認することはできません', 403);
    }

    return { entity, approver };
  }

  /**
   * 単一エンティティを承認
   * @param {string} entityType - エンティティタイプ
   * @param {string} entityId - エンティティID
   * @param {string} approverId - 承認者ID
   * @param {Object} options - 追加オプション
   * @returns {Promise<Object>} 更新されたエンティティ
   */
  static async approveEntity(entityType, entityId, approverId, options = {}) {
    const { entity, approver } = await this.validateEntityAccess(entityType, entityId, approverId);

    if (entity.status === this.STATUS.APPROVED) {
      throw new AppError('既に承認済みです', 400);
    }

    const updateData = {
      status: this.STATUS.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date()
    };

    // 追加のフィールド更新
    Object.assign(updateData, options.additionalFields || {});

    let updatedEntity;

    switch (entityType) {
      case 'timeEntry':
        updatedEntity = await prisma.timeEntry.update({
          where: { id: entityId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        break;

      case 'leaveRequest':
        updatedEntity = await prisma.leaveRequest.update({
          where: { id: entityId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        break;

      default:
        throw new AppError('サポートされていないエンティティタイプです', 400);
    }

    return updatedEntity;
  }

  /**
   * 単一エンティティを却下
   * @param {string} entityType - エンティティタイプ
   * @param {string} entityId - エンティティID
   * @param {string} approverId - 承認者ID
   * @param {string} reason - 却下理由
   * @param {Object} options - 追加オプション
   * @returns {Promise<Object>} 更新されたエンティティ
   */
  static async rejectEntity(entityType, entityId, approverId, reason, options = {}) {
    const { entity, approver } = await this.validateEntityAccess(entityType, entityId, approverId);

    if (entity.status === this.STATUS.REJECTED) {
      throw new AppError('既に却下済みです', 400);
    }

    const updateData = {
      status: this.STATUS.REJECTED,
      rejectedBy: approverId,
      rejectedAt: new Date(),
      rejectionReason: reason
    };

    // 追加のフィールド更新
    Object.assign(updateData, options.additionalFields || {});

    let updatedEntity;

    switch (entityType) {
      case 'timeEntry':
        updatedEntity = await prisma.timeEntry.update({
          where: { id: entityId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        break;

      case 'leaveRequest':
        updatedEntity = await prisma.leaveRequest.update({
          where: { id: entityId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });
        break;

      default:
        throw new AppError('サポートされていないエンティティタイプです', 400);
    }

    return updatedEntity;
  }

  /**
   * 一括承認処理
   * @param {string} entityType - エンティティタイプ
   * @param {Array<string>} entityIds - エンティティIDの配列
   * @param {string} approverId - 承認者ID
   * @param {Object} options - 追加オプション
   * @returns {Promise<Object>} 処理結果
   */
  static async bulkApproveEntities(entityType, entityIds, approverId, options = {}) {
    const approver = await this.validateApprover(approverId);

    // 対象エンティティの事前チェック
    const entities = await this.getEntitiesByType(entityType, entityIds, approver.companyId);

    if (entities.length !== entityIds.length) {
      throw new AppError('承認対象に無効なデータが含まれています', 400);
    }

    const updateData = {
      status: this.STATUS.APPROVED,
      approvedBy: approverId,
      approvedAt: new Date()
    };

    // 追加のフィールド更新
    Object.assign(updateData, options.additionalFields || {});

    let result;

    switch (entityType) {
      case 'timeEntry':
        result = await prisma.timeEntry.updateMany({
          where: {
            id: { in: entityIds },
            status: this.STATUS.PENDING
          },
          data: updateData
        });
        break;

      case 'leaveRequest':
        result = await prisma.leaveRequest.updateMany({
          where: {
            id: { in: entityIds },
            status: this.STATUS.PENDING
          },
          data: updateData
        });
        break;

      default:
        throw new AppError('サポートされていないエンティティタイプです', 400);
    }

    return {
      updatedCount: result.count,
      totalRequested: entityIds.length,
      approver: {
        id: approver.id,
        name: `${approver.lastName} ${approver.firstName}`
      }
    };
  }

  /**
   * エンティティタイプ別の取得処理
   * @param {string} entityType - エンティティタイプ
   * @param {Array<string>} entityIds - エンティティIDの配列
   * @param {string} companyId - 会社ID
   * @returns {Promise<Array>} エンティティの配列
   */
  static async getEntitiesByType(entityType, entityIds, companyId) {
    const whereCondition = {
      id: { in: entityIds }
    };

    // ADMINでない場合は会社IDでフィルタ
    if (companyId) {
      whereCondition.user = {
        companyId
      };
    }

    switch (entityType) {
      case 'timeEntry':
        return await prisma.timeEntry.findMany({
          where: whereCondition
        });

      case 'leaveRequest':
        return await prisma.leaveRequest.findMany({
          where: whereCondition
        });

      default:
        throw new AppError('サポートされていないエンティティタイプです', 400);
    }
  }

  /**
   * 承認ステータスのフィルタリング
   * @param {Array} items - アイテム配列
   * @param {string} status - フィルタするステータス
   * @returns {Array} フィルタされたアイテム
   */
  static filterByStatus(items, status) {
    if (!status || !Object.values(this.STATUS).includes(status)) {
      return items;
    }
    return items.filter(item => item.status === status);
  }

  /**
   * 承認統計を計算
   * @param {Array} items - アイテム配列
   * @returns {Object} 統計情報
   */
  static calculateApprovalStats(items) {
    const total = items.length;
    const approved = items.filter(item => item.status === this.STATUS.APPROVED).length;
    const pending = items.filter(item => item.status === this.STATUS.PENDING).length;
    const rejected = items.filter(item => item.status === this.STATUS.REJECTED).length;
    const draft = items.filter(item => item.status === this.STATUS.DRAFT).length;

    return {
      total,
      approved,
      pending,
      rejected,
      draft,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
      pendingRate: total > 0 ? ((pending / total) * 100).toFixed(1) : 0
    };
  }

  /**
   * 承認ステータスの日本語変換
   * @param {string} status - ステータス
   * @returns {string} 日本語ステータス
   */
  static getStatusLabel(status) {
    const labels = {
      [this.STATUS.PENDING]: '承認待ち',
      [this.STATUS.APPROVED]: '承認済み',
      [this.STATUS.REJECTED]: '却下',
      [this.STATUS.DRAFT]: '下書き'
    };
    return labels[status] || '不明';
  }
}

module.exports = ApprovalProcessService;
