const CommonValidationRules = require('./CommonValidationRules');

/**
 * 管理者関連のバリデーション
 */
class AdminValidator {
  /**
   * システム統計取得時のクエリバリデーション
   */
  static statsQuery = [
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate'),
    CommonValidationRules.optionalEnumQuery('groupBy', ['day', 'week', 'month', 'year'])
  ];

  /**
   * ユーザー管理一覧取得時のクエリバリデーション
   */
  static userManagementQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalStringQuery('search'),
    CommonValidationRules.optionalEnumQuery('role', ['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER']),
    CommonValidationRules.optionalEnumQuery('status', ['active', 'inactive']),
    CommonValidationRules.optionalUuidQuery('companyId')
  ];

  /**
   * 会社管理一覧取得時のクエリバリデーション
   */
  static companyManagementQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalStringQuery('search'),
    CommonValidationRules.optionalEnumQuery('status', ['active', 'inactive'])
  ];

  /**
   * システム設定更新時のバリデーション
   */
  static updateSystemSettings = [
    CommonValidationRules.optionalString('siteName'),
    CommonValidationRules.optionalString('siteDescription'),
    CommonValidationRules.optionalUrl('siteUrl'),
    CommonValidationRules.optionalEmail('contactEmail'),
    CommonValidationRules.optionalBoolean('maintenanceMode'),
    CommonValidationRules.optionalBoolean('registrationEnabled'),
    CommonValidationRules.optionalInt('maxUsersPerCompany', { min: 1 }),
    CommonValidationRules.optionalInt('sessionTimeout', { min: 300 }) // 最低5分
  ];

  /**
   * 一括操作時のバリデーション
   */
  static bulkOperation = [
    CommonValidationRules.requiredArray('targetIds', '対象IDの配列が必要です'),
    CommonValidationRules.stringIdArray('targetIds', '有効なIDが必要です'),
    CommonValidationRules.requiredEnum('action', ['activate', 'deactivate', 'delete', 'suspend'], '有効なアクションを指定してください'),
    CommonValidationRules.optionalString('reason', '理由は文字列である必要があります')
  ];

  /**
   * ログ取得時のクエリバリデーション
   */
  static logsQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 500 }),
    CommonValidationRules.optionalEnumQuery('level', ['error', 'warn', 'info', 'debug']),
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate'),
    CommonValidationRules.optionalStringQuery('search')
  ];

  /**
   * メンテナンス操作時のバリデーション
   */
  static maintenance = [
    CommonValidationRules.requiredBoolean('enabled', 'メンテナンスモードの有効/無効を指定してください'),
    CommonValidationRules.optionalString('message', 'メンテナンスメッセージは文字列である必要があります'),
    CommonValidationRules.optionalDate('scheduledEnd', '終了予定日時は有効な日付である必要があります')
  ];
}

module.exports = AdminValidator;
