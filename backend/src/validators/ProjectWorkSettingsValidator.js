const CommonValidationRules = require('./CommonValidationRules');

/**
 * プロジェクト勤務設定関連のバリデーション
 */
class ProjectWorkSettingsValidator {
  /**
   * プロジェクト勤務設定更新時のバリデーション
   */
  static update = [
    CommonValidationRules.timeFormat('startTime', '開始時刻は HH:MM 形式で入力してください'),
    CommonValidationRules.timeFormat('endTime', '終了時刻は HH:MM 形式で入力してください'),
    CommonValidationRules.optionalInt('breakTime', { min: 0 }, '休憩時間は0以上の整数で入力してください'),
    CommonValidationRules.optionalInt('defaultTransportationCost', { min: 0 }, '交通費は0以上の整数で入力してください')
  ];
}

module.exports = ProjectWorkSettingsValidator;
