const CommonValidationRules = require('./CommonValidationRules');

/**
 * ユーザー関連のバリデーション
 */
class UserValidator {
  /**
   * ユーザー作成・更新時のバリデーション
   */
  static createOrUpdate = [
    CommonValidationRules.optionalString('firstName').notEmpty().withMessage('名前（名）は必須です'),
    CommonValidationRules.optionalString('lastName').notEmpty().withMessage('名前（姓）は必須です'),
    CommonValidationRules.optionalEmail('email', '有効なメールアドレスを入力してください'),
    CommonValidationRules.userRole(),
    CommonValidationRules.optionalBoolean('isActive', 'isActiveは真偽値である必要があります')
  ];

  /**
   * ユーザー作成時のバリデーション
   */
  static create = UserValidator.createOrUpdate;

  /**
   * ユーザー更新時のバリデーション
   */
  static update = UserValidator.createOrUpdate;
}

module.exports = UserValidator;
