const CommonValidationRules = require('./CommonValidationRules');

/**
 * 会社関連のバリデーション
 */
class CompanyValidator {
  /**
   * 会社作成時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredString('name', '会社名は必須です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.optionalString('address'),
    CommonValidationRules.optionalString('phone'),
    CommonValidationRules.optionalUrl('website'),
    CommonValidationRules.optionalBoolean('isActive')
  ];

  /**
   * 会社更新時のバリデーション
   */
  static update = [
    CommonValidationRules.optionalString('name').notEmpty().withMessage('会社名が空です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.optionalString('address'),
    CommonValidationRules.optionalString('phone'),
    CommonValidationRules.optionalUrl('website'),
    CommonValidationRules.optionalBoolean('isActive')
  ];
}

module.exports = CompanyValidator;
