const CommonValidationRules = require('./CommonValidationRules');

/**
 * プロジェクト関連のバリデーション
 */
class ProjectValidator {
  /**
   * プロジェクト作成時のバリデーション
   */
  static create = [
    CommonValidationRules.requiredString('name', 'プロジェクト名は必須です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.requiredDate('startDate', '開始日は有効な日付である必要があります'),
    CommonValidationRules.optionalDate('endDate', '終了日は有効な日付である必要があります'),
    CommonValidationRules.projectStatus(),
    CommonValidationRules.optionalArray('managerIds', 'マネージャーIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('managerIds', 'マネージャーIDは文字列である必要があります'),
    // クライアント情報フィールド
    CommonValidationRules.optionalString('clientCompanyName'),
    CommonValidationRules.optionalString('clientContactName'),
    CommonValidationRules.optionalString('clientContactPhone'),
    CommonValidationRules.optionalEmail('clientContactEmail'),
    CommonValidationRules.optionalString('clientPrefecture'),
    CommonValidationRules.optionalString('clientCity'),
    CommonValidationRules.optionalString('clientStreetAddress'),
    // その他のフィールド
    CommonValidationRules.optionalStringId('companyId', '会社IDは文字列である必要があります'),
    CommonValidationRules.optionalArray('memberIds', 'メンバーIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('memberIds', 'メンバーIDは文字列である必要があります'),
    CommonValidationRules.optionalArray('skillIds', 'スキルIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('skillIds', 'スキルIDは文字列である必要があります')
  ];
  /**
   * プロジェクト更新時のバリデーション
   */
  static update = [
    CommonValidationRules.optionalString('name').notEmpty().withMessage('プロジェクト名が空です'),
    CommonValidationRules.optionalString('description'),
    CommonValidationRules.optionalDate('startDate', '開始日は有効な日付である必要があります'),
    CommonValidationRules.optionalDate('endDate', '終了日は有効な日付である必要があります'),
    CommonValidationRules.projectStatus(),
    CommonValidationRules.optionalArray('managerIds', 'マネージャーIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('managerIds', 'マネージャーIDは文字列である必要があります'),
    // クライアント情報フィールド
    CommonValidationRules.optionalString('clientCompanyName'),
    CommonValidationRules.optionalString('clientContactName'),
    CommonValidationRules.optionalString('clientContactPhone'),
    CommonValidationRules.optionalEmail('clientContactEmail'),
    CommonValidationRules.optionalString('clientPrefecture'),
    CommonValidationRules.optionalString('clientCity'),
    CommonValidationRules.optionalString('clientStreetAddress'),
    // その他のフィールド
    CommonValidationRules.optionalStringId('companyId', '会社IDは文字列である必要があります'),
    CommonValidationRules.optionalArray('memberIds', 'メンバーIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('memberIds', 'メンバーIDは文字列である必要があります'),
    CommonValidationRules.optionalArray('skillIds', 'スキルIDは配列である必要があります'),
    CommonValidationRules.stringIdArray('skillIds', 'スキルIDは文字列である必要があります')
  ];

  /**
   * メンバー追加時のバリデーション
   */
  static addMember = [
    CommonValidationRules.requiredStringId('userId', 'ユーザーIDは必須です'),
    CommonValidationRules.percentage('allocation', '割り当て率は0-100の範囲で入力してください')
  ];
  /**
   * メンバー削除時のバリデーション
   */
  static removeMember = [
    // パラメータバリデーションは別途ルートで処理
  ];

  /**
   * メンバー工数配分更新時のバリデーション
   */
  static updateMemberAllocation = [
    CommonValidationRules.percentage('allocation', '割り当て率は0-100の範囲で入力してください')
  ];
}

module.exports = ProjectValidator;
