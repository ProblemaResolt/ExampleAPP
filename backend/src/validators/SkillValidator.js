const CommonValidationRules = require('./CommonValidationRules');

/**
 * スキル関連のバリデーション
 */
class SkillValidator {
  /**
   * スキル作成時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredString('name', 'スキル名は必須です'),
    CommonValidationRules.requiredString('category', 'カテゴリは必須です'),
    CommonValidationRules.optionalString('description')
  ];

  /**
   * スキル更新時のバリデーション
   */
  static update = [
    CommonValidationRules.requiredString('name', 'スキル名は必須です'),
    CommonValidationRules.requiredString('category', 'カテゴリは必須です'),
    CommonValidationRules.optionalString('description')
  ];

  /**
   * 会社スキル追加時のバリデーション
   */
  static addCompanySkill = [
    CommonValidationRules.requiredStringId('globalSkillId', 'グローバルスキルIDが必要です'),
    CommonValidationRules.optionalBoolean('isRequired', '必須フラグは真偽値である必要があります')
  ];

  /**
   * 会社スキル一括追加時のバリデーション
   */
  static addCompanySkillsBulk = [
    CommonValidationRules.requiredArray('globalSkillIds', 'グローバルスキルIDの配列が必要です')
  ];

  /**
   * ユーザースキル追加時のバリデーション（数値レベル）
   */
  static addUserSkillNumeric = [
    CommonValidationRules.requiredInt('userId', {}, '有効なユーザーIDが必要です'),
    CommonValidationRules.requiredInt('skillId', {}, '有効なスキルIDが必要です'),
    CommonValidationRules.skillLevelNumeric(),
    CommonValidationRules.experienceYears()
  ];

  /**
   * グローバルスキル作成時のバリデーション
   */
  static createGlobal = [
    CommonValidationRules.requiredString('name', 'スキル名は必須です'),
    CommonValidationRules.requiredString('category', 'カテゴリは必須です'),
    CommonValidationRules.optionalString('description')
  ];  /**
   * ユーザースキル追加時のバリデーション（文字列レベル）
   */
  static addUserSkillString = [
    CommonValidationRules.requiredStringId('userId', '有効なユーザーIDが必要です'),
    CommonValidationRules.requiredStringId('companySelectedSkillId', '有効なスキルIDが必要です'),
    CommonValidationRules.skillLevel(),
    CommonValidationRules.years(),
    CommonValidationRules.optionalString('certifications')
  ];
}

module.exports = SkillValidator;
