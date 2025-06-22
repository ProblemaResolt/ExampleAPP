const CommonValidationRules = require('./CommonValidationRules');

/**
 * 認証関連のバリデーション
 */
class AuthValidator {
  /**
   * ユーザー登録時のバリデーション
   */
  static register = [
    CommonValidationRules.requiredEmail('email', '有効なメールアドレスを入力してください'),
    CommonValidationRules.requiredString('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります'),
    CommonValidationRules.requiredString('firstName', '名前（名）は必須です'),
    CommonValidationRules.requiredString('lastName', '名前（姓）は必須です'),
    CommonValidationRules.requiredEnum('role', ['COMPANY', 'MANAGER', 'MEMBER'], '無効なロールです')
  ];

  /**
   * ログイン時のバリデーション
   */
  static login = [
    CommonValidationRules.requiredEmail('email', '有効なメールアドレスを入力してください'),
    CommonValidationRules.requiredString('password', 'パスワードは必須です')
  ];

  /**
   * パスワードリセット要求時のバリデーション
   */
  static passwordResetRequest = [
    CommonValidationRules.requiredEmail('email', '有効なメールアドレスを入力してください')
  ];

  /**
   * パスワードリセット実行時のバリデーション
   */
  static passwordReset = [
    CommonValidationRules.requiredString('token', 'リセットトークンは必須です'),
    CommonValidationRules.requiredString('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります')
  ];

  /**
   * パスワード変更時のバリデーション
   */
  static changePassword = [
    CommonValidationRules.requiredString('currentPassword', '現在のパスワードは必須です'),
    CommonValidationRules.requiredString('newPassword').isLength({ min: 6 }).withMessage('新しいパスワードは6文字以上である必要があります')
  ];
}

module.exports = AuthValidator;
