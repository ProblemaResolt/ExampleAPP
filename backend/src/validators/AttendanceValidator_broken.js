const CommonValidationRules = require('./CommonValidationRules');

/**
 * 勤怠関連のバリデーション
 */
class AttendanceValidator {
  /**
   * 勤怠統計クエリパラメータのバリデーション
   */
  static get statsQuery() {
    return [
      CommonValidationRules.optionalDateQuery('startDate', '開始日は有効な日付である必要があります'),
      CommonValidationRules.optionalDateQuery('endDate', '終了日は有効な日付である必要があります')
    ];
  }

  /**
   * 勤怠エントリー関連のクエリパラメータ
   */
  static get entryQuery() {
    return AttendanceValidator.statsQuery;
  }

  /**
   * 出勤打刻時のバリデーション
   */
  static get clockIn() {
    return [
      CommonValidationRules.requiredDate('date', '有効な日付を入力してください'),
      CommonValidationRules.optionalString('location'),
      CommonValidationRules.optionalString('note')
    ];
  }

  /**
   * 退勤打刻時のバリデーション
   */
  static clockOut = [
    CommonValidationRules.optionalString('location'),
    CommonValidationRules.optionalString('note')
  ];

  /**
   * 遅刻打刻時のバリデーション
   */
  static lateArrival = [
    CommonValidationRules.optionalString('reason')
  ];

  /**
   * 休憩プリセット作成時のバリデーション
   */
  static createBreakPreset = [
    CommonValidationRules.requiredString('name', 'プリセット名は必須です'),
    CommonValidationRules.requiredInt('duration', { min: 1 }, '有効な時間を入力してください'),
    CommonValidationRules.optionalEnum('type', ['BREAK', 'LUNCH'], '有効なタイプを選択してください')
  ];

  /**
   * 勤務設定作成時のバリデーション
   */
  static createWorkSettings = [
    CommonValidationRules.timeFormat('workStartTime', '有効な開始時刻を入力してください'),
    CommonValidationRules.timeFormat('workEndTime', '有効な終了時刻を入力してください'),
    CommonValidationRules.optionalInt('breakDuration', { min: 0 }, '有効な休憩時間を入力してください'),
    CommonValidationRules.optionalBoolean('flexTime'),
    CommonValidationRules.optionalBoolean('overtime')
  ];

  /**
   * 勤務設定更新時のバリデーション
   */
  static updateWorkSettings = AttendanceValidator.createWorkSettings;
  /**
   * 管理者用ユーザー勤務設定更新時のバリデーション
   */
  static adminUpdateUserWorkSettings = [
    CommonValidationRules.requiredUuidParam('userId', '有効なユーザーIDが必要です'),
    ...AttendanceValidator.createWorkSettings
  ];
  /**
   * 管理者用一括勤務設定更新時のバリデーション
   */
  static adminBulkUpdateWorkSettings = [
    CommonValidationRules.requiredArray('userIds', 'ユーザーIDの配列が必要です'),
    CommonValidationRules.stringIdArray('userIds', '有効なユーザーIDが必要です'),
    CommonValidationRules.timeFormat('settings.workStartTime', '有効な開始時刻を入力してください'),
    CommonValidationRules.timeFormat('settings.workEndTime', '有効な終了時刻を入力してください'),
    CommonValidationRules.optionalInt('settings.breakDuration', { min: 0 }, '有効な休憩時間を入力してください'),
    CommonValidationRules.optionalBoolean('settings.flexTime'),
    CommonValidationRules.optionalBoolean('settings.overtime')
  ];

  /**
   * 一括交通費登録時のバリデーション
   */
  static bulkTransportation = [
    CommonValidationRules.requiredArray('entries', 'entries配列が必要です'),
    CommonValidationRules.objectArrayField('entries', 'userId', 'uuid', '有効なユーザーIDが必要です'),
    CommonValidationRules.objectArrayField('entries', 'date', 'date', '有効な日付が必要です'),
    CommonValidationRules.objectArrayField('entries', 'transportation', 'float', '有効な交通費金額が必要です', { min: 0 }),
    CommonValidationRules.objectArrayField('entries', 'transportationNote', 'optional_string', null)
  ];

  /**
   * 勤怠データ更新時のバリデーション（一般用）
   */
  static updateAttendanceBody = [
    CommonValidationRules.requiredUuid('timeEntryId', '有効な勤怠記録IDが必要です'),
    CommonValidationRules.optionalDate('clockIn'),
    CommonValidationRules.optionalDate('clockOut'),
    CommonValidationRules.optionalFloat('workHours', { min: 0 }),
    CommonValidationRules.optionalString('note'),
    CommonValidationRules.optionalFloat('transportation', { min: 0 }),
    CommonValidationRules.optionalString('transportationNote'),
    CommonValidationRules.optionalEnum('status', ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'])
  ];

  /**
   * 勤怠データ更新時のバリデーション（管理者用パラメータ）
   */
  static updateAttendanceParam = [
    CommonValidationRules.requiredUuidParam('timeEntryId', '有効な勤怠記録IDが必要です'),
    CommonValidationRules.optionalDate('clockIn'),
    CommonValidationRules.optionalDate('clockOut'),
    CommonValidationRules.optionalFloat('workHours', { min: 0 }),
    CommonValidationRules.optionalString('note'),
    CommonValidationRules.optionalFloat('transportation', { min: 0 }),
    CommonValidationRules.optionalString('transportationNote'),
    CommonValidationRules.optionalEnum('status', ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'])
  ];

  /**
   * 作業報告作成時のバリデーション
   */
  static createWorkReport = [
    CommonValidationRules.optionalUuid('projectId'),
    CommonValidationRules.requiredString('description', '作業内容は必須です'),
    CommonValidationRules.requiredFloat('workHours', { min: 0 }, '作業時間は0以上の数値である必要があります'),
    CommonValidationRules.optionalArray('tasks')
  ];

  /**
   * 作業報告更新時のバリデーション
   */
  static updateWorkReport = AttendanceValidator.createWorkReport;

  /**
   * 作業報告一覧取得時のバリデーション
   */
  static workReportsQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalUuidQuery('projectId'),
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate')
  ];

  /**
   * プロジェクト統計取得時のバリデーション
   */
  static projectStatsQuery = [
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate')
  ];

  /**
   * 重複検出時のバリデーション
   */
  static duplicateDetectionQuery = AttendanceValidator.projectStatsQuery;

  /**
   * 承認待ち一覧取得時のバリデーション
   */
  static pendingApprovalQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalEnumQuery('status', ['PENDING', 'APPROVED', 'REJECTED']),
    CommonValidationRules.optionalUuidQuery('projectId', '有効なプロジェクトIDを入力してください'),
    CommonValidationRules.optionalStringQuery('userName', 'ユーザー名は文字列で入力してください'),
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate')
  ];

  /**
   * 勤怠記録却下時のバリデーション
   */
  static rejectTimeEntry = [
    CommonValidationRules.requiredString('reason', '却下理由は必須です')
  ];

  /**
   * 一括承認時のバリデーション
   */
  static bulkApprove = [
    CommonValidationRules.requiredArray('timeEntryIds', '承認対象のIDが必要です', { min: 1 }),
    CommonValidationRules.stringIdArray('timeEntryIds', '無効なIDが含まれています')
  ];

  /**
   * メンバー一括承認時のバリデーション
   */
  static bulkApproveMember = [
    CommonValidationRules.requiredEnum('action', ['APPROVED', 'REJECTED'], '有効なアクションを指定してください'),
    CommonValidationRules.requiredInt('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredInt('month', { min: 1, max: 12 }, '有効な月を入力してください')
  ];

  /**
   * メンバー一括却下時のバリデーション
   */
  static bulkRejectMember = [
    CommonValidationRules.requiredInt('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredInt('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.optionalString('reason', '却下理由は文字列で入力してください')
  ];

  /**
   * プロジェクトメンバーサマリー取得時のバリデーション
   */
  static projectMembersSummaryQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.optionalUuidQuery('projectId', '有効なプロジェクトIDを入力してください')
  ];

  /**
   * 個人勤怠データ取得時のバリデーション
   */
  static individualAttendanceQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください')
  ];

  /**
   * プロジェクトExcel出力時のバリデーション
   */
  static exportProjectExcelQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.requiredUuidQuery('projectId', '有効なプロジェクトIDを入力してください')
  ];

  /**
   * メンバーExcel出力時のバリデーション
   */
  static exportMemberExcelQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.requiredUuidQuery('userId', '有効なユーザーIDを入力してください')
  ];

  /**
   * プロジェクトPDF出力時のバリデーション
   */
  static exportProjectPdfQuery = AttendanceValidator.exportProjectExcelQuery;

  /**
   * メンバーPDF出力時のバリデーション
   */
  static exportMemberPdfQuery = AttendanceValidator.exportMemberExcelQuery;
  /**
   * 個別勤怠記録却下時のバリデーション
   */
  static rejectIndividualTimeEntry = [
    CommonValidationRules.optionalString('reason', '却下理由は文字列で入力してください')
  ];

  /**
   * 統計取得時のバリデーション
   */
  static statsQueryWithYear = [
    CommonValidationRules.optionalIntQuery('year', { min: 2020, max: 2030 }),
    CommonValidationRules.optionalIntQuery('month', { min: 1, max: 12 })
  ];

  /**
   * チーム統計取得時のバリデーション
   */
  static teamStatsQuery = [
    CommonValidationRules.optionalIntQuery('year', { min: 2020, max: 2030 }),
    CommonValidationRules.optionalIntQuery('month', { min: 1, max: 12 }),
    CommonValidationRules.optionalStringQuery('projectId')
  ];

  /**
   * 勤怠エントリー一覧取得時のバリデーション
   */
  static entriesQuery = [
    CommonValidationRules.optionalIntQuery('page', { min: 1 }),
    CommonValidationRules.optionalIntQuery('limit', { min: 1, max: 100 }),
    CommonValidationRules.optionalDateQuery('startDate'),
    CommonValidationRules.optionalDateQuery('endDate'),
    CommonValidationRules.optionalEnumQuery('status', ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT']),
    CommonValidationRules.optionalUuidQuery('userId')
  ];

  /**
   * 月次レポート取得時のバリデーション
   */
  static monthlyReportQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.optionalUuidQuery('userId')
  ];

  /**
   * 月別データ取得時のパラメータバリデーション
   */
  static monthlyDataParams = [
    CommonValidationRules.requiredIntParam('year', { min: 2000, max: 3000 }),
    CommonValidationRules.requiredIntParam('month', { min: 1, max: 12 })
  ];

  /**
   * Excelエクスポート時のバリデーション
   */
  static excelExportQuery = [
    CommonValidationRules.requiredIntQuery('year', { min: 2000, max: 3000 }, '有効な年を入力してください'),
    CommonValidationRules.requiredIntQuery('month', { min: 1, max: 12 }, '有効な月を入力してください'),
    CommonValidationRules.optionalUuidQuery('userId', '有効なユーザーIDを入力してください'),
    CommonValidationRules.optionalEnumQuery('format', ['monthly'], '有効なフォーマットを指定してください')
  ];
}

module.exports = AttendanceValidator;
