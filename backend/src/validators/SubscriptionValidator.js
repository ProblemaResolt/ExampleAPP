const CommonValidationRules = require('./CommonValidationRules');

/**
 * サブスクリプション関連のバリデーション
 */
class SubscriptionValidator {
  /**
   * サブスクリプション作成時のバリデーション
   */
  static create = [
    CommonValidationRules.subscriptionPlan(),
    CommonValidationRules.optionalStringId('paymentMethodId'),
    CommonValidationRules.optionalString('couponCode')
  ];

  /**
   * サブスクリプション更新時のバリデーション
   */
  static update = [
    CommonValidationRules.optionalEnum('plan', ['BASIC', 'PRO', 'ENTERPRISE'], '無効なプランです'),
    CommonValidationRules.optionalStringId('paymentMethodId'),
    CommonValidationRules.optionalString('couponCode')
  ];
}

module.exports = SubscriptionValidator;
