const CommonValidationRules = require('./CommonValidationRules');

/**
 * プロジェクト関連のバリデーション
 */
class ProjectValidator {
  /**
   * プロジェクト作成時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredString('name', 'プロジェクト名は必須です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.optionalDate('startDate'),
    CommonValidationRules.optionalDate('endDate'),
    CommonValidationRules.optionalEnum('status', ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], '無効なステータスです'),
    CommonValidationRules.optionalUuid('companyId', '有効な会社IDを入力してください'),
    CommonValidationRules.optionalArray('tags'),
    CommonValidationRules.optionalFloat('budget', { min: 0 }, '予算は0以上の数値である必要があります'),
    CommonValidationRules.optionalInt('priority', { min: 1, max: 5 }, '優先度は1-5の値である必要があります')
  ];

  /**
   * プロジェクト更新時のバリデーション
   */
  static update = [
    CommonValidationRules.optionalString('name').notEmpty().withMessage('プロジェクト名が空です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.optionalDate('startDate'),
    CommonValidationRules.optionalDate('endDate'),
    CommonValidationRules.optionalEnum('status', ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], '無効なステータスです'),
    CommonValidationRules.optionalUuid('companyId', '有効な会社IDを入力してください'),
    CommonValidationRules.optionalArray('tags'),
    CommonValidationRules.optionalFloat('budget', { min: 0 }, '予算は0以上の数値である必要があります'),
    CommonValidationRules.optionalInt('priority', { min: 1, max: 5 }, '優先度は1-5の値である必要があります')
  ];

  /**
   * プロジェクト一覧取得時のクエリバリデーション
   */
  static getProjectsQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalStringQuery('search'),
    CommonValidationRules.optionalEnumQuery('status', ['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    CommonValidationRules.optionalUuidQuery('companyId'),
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate')
  ];

  /**
   * プロジェクトIDパラメータのバリデーション
   */
  static projectIdParam = [
    CommonValidationRules.requiredUuidParam('id', '有効なプロジェクトIDが必要です')
  ];

  /**
   * プロジェクトメンバー追加時のバリデーション
   */
  static addMember = [
    CommonValidationRules.requiredUuid('userId', '有効なユーザーIDが必要です'),
    CommonValidationRules.optionalEnum('role', ['MANAGER', 'MEMBER'], '無効なロールです'),
    CommonValidationRules.optionalPercentage('allocation', 'アロケーションは0-100の値である必要があります'),
    CommonValidationRules.optionalDate('startDate'),
    CommonValidationRules.optionalDate('endDate')
  ];

  /**
   * プロジェクトメンバー更新時のバリデーション
   */
  static updateMember = [
    CommonValidationRules.optionalEnum('role', ['MANAGER', 'MEMBER'], '無効なロールです'),
    CommonValidationRules.optionalPercentage('allocation', 'アロケーションは0-100の値である必要があります'),
    CommonValidationRules.optionalDate('startDate'),
    CommonValidationRules.optionalDate('endDate'),
    CommonValidationRules.optionalBoolean('isActive')
  ];

  /**
   * プロジェクトメンバーIDパラメータのバリデーション
   */
  static memberIdParam = [
    CommonValidationRules.requiredUuidParam('userId', '有効なユーザーIDが必要です')
  ];

  /**
   * プロジェクト統計取得時のクエリバリデーション
   */
  static statsQuery = [
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate'),
    CommonValidationRules.optionalEnumQuery('groupBy', ['month', 'quarter', 'year'])
  ];
}

module.exports = ProjectValidator;
