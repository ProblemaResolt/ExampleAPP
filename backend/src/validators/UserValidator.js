const CommonValidationRules = require('./CommonValidationRules');

/**
 * ユーザー関連のバリデーション
 */
class UserValidator {
  /**
   * ユーザー作成時のバリデーション
   */
  static createUser = [
    CommonValidationRules.requiredEmail('email', '有効なメールアドレスを入力してください'),
    CommonValidationRules.requiredString('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります'),
    CommonValidationRules.requiredString('firstName', '名前（名）は必須です'),
    CommonValidationRules.requiredString('lastName', '名前（姓）は必須です'),
    CommonValidationRules.requiredEnum('role', ['COMPANY', 'MANAGER', 'MEMBER'], '無効なロールです'),
    CommonValidationRules.optionalUuid('companyId', '有効な会社IDを入力してください')
  ];

  /**
   * ユーザー更新時のバリデーション
   */
  static updateUser = [
    CommonValidationRules.optionalEmail('email', '有効なメールアドレスを入力してください'),
    CommonValidationRules.optionalString('firstName'),
    CommonValidationRules.optionalString('lastName'),
    CommonValidationRules.optionalEnum('role', ['COMPANY', 'MANAGER', 'MEMBER'], '無効なロールです'),
    CommonValidationRules.optionalUuid('companyId', '有効な会社IDを入力してください'),
    CommonValidationRules.optionalBoolean('isActive')
  ];

  /**
   * ユーザー一覧取得時のクエリバリデーション
   */
  static getUsersQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalStringQuery('search'),
    CommonValidationRules.optionalEnumQuery('role', ['COMPANY', 'MANAGER', 'MEMBER']),
    CommonValidationRules.optionalUuidQuery('companyId'),
    CommonValidationRules.optionalEnumQuery('status', ['active', 'inactive'])
  ];

  /**
   * ユーザーIDパラメータのバリデーション
   */
  static userIdParam = [
    CommonValidationRules.requiredUuidParam('id', '有効なユーザーIDが必要です')
  ];

  /**
   * プロフィール更新時のバリデーション
   */
  static updateProfile = [
    CommonValidationRules.optionalString('firstName'),
    CommonValidationRules.optionalString('lastName'),
    CommonValidationRules.optionalEmail('email', '有効なメールアドレスを入力してください')
  ];

  /**
   * パスワード変更時のバリデーション
   */
  static changePassword = [
    CommonValidationRules.requiredString('currentPassword', '現在のパスワードは必須です'),
    CommonValidationRules.requiredString('newPassword').isLength({ min: 6 }).withMessage('新しいパスワードは6文字以上である必要があります')
  ];

  /**
   * 一括操作時のバリデーション
   */
  static bulkOperation = [
    CommonValidationRules.requiredArray('userIds', 'ユーザーIDの配列が必要です'),
    CommonValidationRules.stringIdArray('userIds', '有効なユーザーIDが必要です'),
    CommonValidationRules.requiredEnum('action', ['activate', 'deactivate', 'delete'], '有効なアクションを指定してください')
  ];
}

module.exports = UserValidator;
