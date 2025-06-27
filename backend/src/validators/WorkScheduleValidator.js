const CommonValidationRules = require('./CommonValidationRules');

/**
 * 勤務スケジュール関連のバリデーション
 */
class WorkScheduleValidator {
  /**
   * 勤務スケジュール作成時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredString('name', '勤務パターン名は必須です'),
    CommonValidationRules.requiredFloat('standardHours', { min: 1, max: 12 }, '標準労働時間は1-12時間で入力してください'),
    CommonValidationRules.timeFormat('flexTimeStart', '有効な時刻形式(HH:mm)で入力してください'),
    CommonValidationRules.timeFormat('flexTimeEnd', '有効な時刻形式(HH:mm)で入力してください'),
    CommonValidationRules.timeFormat('coreTimeStart', '有効な時刻形式(HH:mm)で入力してください'),
    CommonValidationRules.timeFormat('coreTimeEnd', '有効な時刻形式(HH:mm)で入力してください'),
    CommonValidationRules.optionalFloat('breakDuration', { min: 0 }, '休憩時間は0分以上で入力してください'),
    CommonValidationRules.optionalFloat('overtimeThreshold', { min: 1 }, '残業判定時間は1時間以上で入力してください'),
    CommonValidationRules.optionalBoolean('isFlexTime'),
    CommonValidationRules.optionalBoolean('isDefault')
  ];

  /**
   * 勤務スケジュール更新時のバリデーション
   */
  static update = WorkScheduleValidator.create;

  /**
   * ユーザー勤務スケジュール割り当て時のバリデーション
   */
  static assignToUser = [
    CommonValidationRules.requiredStringId('userId', 'ユーザーIDは必須です'),
    CommonValidationRules.requiredStringId('workScheduleId', '勤務スケジュールIDは必須です'),
    CommonValidationRules.requiredDate('startDate', '有効な開始日を入力してください'),
    CommonValidationRules.optionalDate('endDate', '有効な終了日を入力してください')
  ];

  /**
   * ユーザー勤務スケジュール更新時のバリデーション
   */
  static updateUserAssignment = [
    CommonValidationRules.requiredDate('startDate', '有効な開始日を入力してください'),
    CommonValidationRules.optionalDate('endDate', '有効な終了日を入力してください')
  ];
}

module.exports = WorkScheduleValidator;
