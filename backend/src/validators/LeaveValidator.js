const CommonValidationRules = require('./CommonValidationRules');

/**
 * 休暇関連のバリデーション
 */
class LeaveValidator {
  /**
   * 休暇申請時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredEnum('leaveType', 
      ['PAID_LEAVE', 'SICK_LEAVE', 'PERSONAL_LEAVE', 'MATERNITY', 'PATERNITY', 'SPECIAL', 'UNPAID'], 
      '有効な休暇タイプを選択してください'
    ),
    CommonValidationRules.requiredDate('startDate', '有効な開始日を入力してください'),
    CommonValidationRules.requiredDate('endDate', '有効な終了日を入力してください'),
    CommonValidationRules.requiredFloat('days', { min: 0.5 }, '休暇日数は0.5日以上で入力してください'),
    CommonValidationRules.optionalString('reason')
  ];

  /**
   * 休暇申請更新時のバリデーション
   */
  static update = LeaveValidator.create;

  /**
   * 休暇承認時のバリデーション
   */
  static approve = [
    CommonValidationRules.requiredEnum('action', ['approve', 'reject'], '有効なアクションを選択してください'),
    CommonValidationRules.optionalString('rejectReason')
  ];

  /**
   * 有給残高設定時のバリデーション
   */
  static setBalance = [
    CommonValidationRules.requiredStringId('userId', 'ユーザーIDは必須です'),
    CommonValidationRules.requiredInt('year', { min: 2020, max: 2030 }, '有効な年度を入力してください'),
    CommonValidationRules.requiredInt('annualDays', { min: 0 }, '年次有給日数は0以上の整数で入力してください')
  ];

  /**
   * 有給残高調整時のバリデーション
   */
  static adjustBalance = [
    CommonValidationRules.requiredStringId('userId', 'ユーザーIDは必須です'),
    CommonValidationRules.requiredInt('year', { min: 2020, max: 2030 }, '有効な年度を入力してください'),
    CommonValidationRules.requiredInt('adjustmentDays', {}, '調整日数は必須です'),
    CommonValidationRules.requiredString('reason', '調整理由は必須です')
  ];
}

module.exports = LeaveValidator;
