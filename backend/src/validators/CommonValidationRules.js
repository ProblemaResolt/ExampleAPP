const { body, query, param, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');

/**
 * 共通バリデーションルール
 * 各Validatorクラスから再利用できる共通ルールを定義
 */
class CommonValidationRules {
  // ================================================================
  // 基本的なフィールドバリデーション
  // ================================================================

  /**
   * 必須の文字列フィールド
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredString(fieldName, message = `${fieldName}は必須です`) {
    return body(fieldName).trim().notEmpty().withMessage(message);
  }  /**
   * オプションの文字列フィールド
   * @param {string} fieldName - フィールド名
   * @returns {ValidationChain}
   */
  static optionalString(fieldName) {
    return body(fieldName).optional().trim();
  }

  // ================================================================
  // クエリパラメータ用バリデーション
  // ================================================================

  /**
   * オプションの整数クエリパラメータ
   * @param {string} fieldName - フィールド名
   * @param {Object} options - 最小値・最大値オプション
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalIntQuery(fieldName, options = {}, message = `${fieldName}は整数である必要があります`) {
    return query(fieldName).optional().isInt(options).withMessage(message);
  }

  /**
   * オプションの列挙値クエリパラメータ
   * @param {string} fieldName - フィールド名
   * @param {Array} values - 許可される値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEnumQuery(fieldName, values, message = `無効な${fieldName}です`) {
    return query(fieldName).optional().isIn(values).withMessage(message);
  }

  /**
   * 必須のメールアドレス
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredEmail(fieldName = 'email', message = '有効なメールアドレスを入力してください') {
    return body(fieldName).isEmail().normalizeEmail().withMessage(message);
  }

  /**
   * オプションのメールアドレス
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEmail(fieldName = 'email', message = '無効なメールアドレスです') {
    return body(fieldName).optional({ values: 'falsy' }).isEmail().withMessage(message);
  }

  // ================================================================
  // 日付・時刻バリデーション
  // ================================================================

  /**
   * 必須のISO8601日付
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredDate(fieldName, message = `${fieldName}は有効な日付である必要があります`) {
    return body(fieldName).isISO8601().withMessage(message);
  }

  /**
   * オプションのISO8601日付
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalDate(fieldName, message = `${fieldName}は有効な日付である必要があります`) {
    return body(fieldName).optional({ values: 'falsy' }).isISO8601().withMessage(message);
  }

  /**
   * 時刻フォーマット（HH:MM）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static timeFormat(fieldName, message = `${fieldName}は HH:MM 形式で入力してください`) {
    return body(fieldName).optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage(message);
  }

  // ================================================================
  // 数値バリデーション
  // ================================================================

  /**
   * 必須の整数
   * @param {string} fieldName - フィールド名
   * @param {Object} options - 最小値・最大値オプション
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredInt(fieldName, options = {}, message = `${fieldName}は整数である必要があります`) {
    return body(fieldName).isInt(options).withMessage(message);
  }

  /**
   * オプションの整数
   * @param {string} fieldName - フィールド名
   * @param {Object} options - 最小値・最大値オプション
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalInt(fieldName, options = {}, message = `${fieldName}は整数である必要があります`) {
    return body(fieldName).optional().isInt(options).withMessage(message);
  }

  /**
   * 必須の浮動小数点数
   * @param {string} fieldName - フィールド名
   * @param {Object} options - 最小値・最大値オプション
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredFloat(fieldName, options = {}, message = `${fieldName}は数値である必要があります`) {
    return body(fieldName).isFloat(options).withMessage(message);
  }

  /**
   * オプションの浮動小数点数
   * @param {string} fieldName - フィールド名
   * @param {Object} options - 最小値・最大値オプション
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalFloat(fieldName, options = {}, message = `${fieldName}は数値である必要があります`) {
    return body(fieldName).optional().isFloat(options).withMessage(message);
  }

  /**
   * パーセンテージ（0-100）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static percentage(fieldName, message = `${fieldName}は0-100の範囲で入力してください`) {
    return body(fieldName).optional().isInt({ min: 0, max: 100 }).withMessage(message);
  }

  // ================================================================
  // 配列バリデーション
  // ================================================================

  /**
   * 必須の配列
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredArray(fieldName, message = `${fieldName}は配列である必要があります`) {
    return body(fieldName).isArray().notEmpty().withMessage(message);
  }

  /**
   * オプションの配列
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalArray(fieldName, message = `${fieldName}は配列である必要があります`) {
    return body(fieldName).optional().isArray().withMessage(message);
  }

  /**
   * 文字列IDの配列
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static stringIdArray(fieldName, message = `${fieldName}は文字列である必要があります`) {
    return body(`${fieldName}.*`).optional().isString().withMessage(message);
  }

  // ================================================================
  // ID・識別子バリデーション
  // ================================================================

  /**
   * 必須の文字列ID
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredStringId(fieldName, message = `${fieldName}は必須です`) {
    return body(fieldName).isString().notEmpty().withMessage(message);
  }

  /**
   * オプションの文字列ID
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalStringId(fieldName, message = `${fieldName}は文字列である必要があります`) {
    return body(fieldName).optional().isString().withMessage(message);
  }

  // ================================================================
  // 列挙値バリデーション
  // ================================================================

  /**
   * 必須の列挙値
   * @param {string} fieldName - フィールド名
   * @param {Array} values - 許可される値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredEnum(fieldName, values, message = `無効な${fieldName}です`) {
    return body(fieldName).isIn(values).withMessage(message);
  }

  /**
   * オプションの列挙値
   * @param {string} fieldName - フィールド名
   * @param {Array} values - 許可される値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEnum(fieldName, values, message = `無効な${fieldName}です`) {
    return body(fieldName).optional().isIn(values).withMessage(message);
  }

  // ================================================================
  // 真偽値バリデーション
  // ================================================================

  /**
   * オプションの真偽値
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalBoolean(fieldName, message = `${fieldName}は真偽値である必要があります`) {
    return body(fieldName).optional().isBoolean().withMessage(message);
  }

  // ================================================================
  // URL・その他バリデーション
  // ================================================================

  /**
   * オプションのURL
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUrl(fieldName, message = `${fieldName}は有効なURLである必要があります`) {
    return body(fieldName).optional().trim().isURL().withMessage(message);
  }

  // ================================================================
  // クエリパラメータ用
  // ================================================================

  /**
   * オプションの日付クエリパラメータ
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalDateQuery(fieldName, message = `${fieldName}は有効な日付である必要があります`) {
    return query(fieldName).optional().isISO8601().withMessage(message);
  }

  // ================================================================
  // 事前定義された一般的なバリデーション
  // ================================================================

  /**
   * ユーザー役割
   */
  static userRole() {
    return this.optionalEnum('role', ['ADMIN', 'COMPANY', 'MANAGER', 'MEMBER'], '無効なロールです');
  }

  /**
   * プロジェクトステータス
   */
  static projectStatus() {
    return this.optionalEnum('status', ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ACTIVE'], '無効なステータスです');
  }

  /**
   * サブスクリプションプラン
   */
  static subscriptionPlan() {
    return this.requiredEnum('plan', ['BASIC', 'PRO', 'ENTERPRISE'], '無効なプランです');
  }

  /**
   * スキルレベル
   */
  static skillLevel() {
    return this.optionalEnum('level', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], '無効なレベルです');
  }

  /**
   * スキルレベル（数値）
   */
  static skillLevelNumeric() {
    return this.requiredInt('level', { min: 1, max: 5 }, 'レベルは1-5の整数である必要があります');
  }

  /**
   * 経験年数
   */
  static experienceYears() {
    return this.optionalInt('experienceYears', { min: 0 }, '経験年数は0以上の整数である必要があります');
  }

  /**
   * 年数（別名）
   */
  static years() {
    return this.optionalInt('years', { min: 0 }, '経験年数は0以上の整数である必要があります');
  }

  // ================================================================
  // バリデーションエラーハンドリング統一メソッド
  // ================================================================

  /**
   * バリデーションエラーをチェックし、エラーがあればAppErrorをthrow
   * 各routeで統一的に使用するためのヘルパーメソッド
   * @param {Object} req - Express request object
   * @param {string} errorMessage - エラーメッセージ（デフォルト: 'バリデーションエラー'）
   * @throws {AppError} バリデーションエラーがある場合
   */
  static handleValidationErrors(req, errorMessage = 'バリデーションエラー') {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errorMessage, 400, errors.array());
    }
  }

  /**
   * バリデーションエラーをチェックし、エラーがあればレスポンスを返す
   * throw せずに res.status().json() でレスポンスを返したい場合用
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} errorMessage - エラーメッセージ（デフォルト: 'バリデーションエラー'）
   * @returns {boolean} エラーがあった場合 true, なかった場合 false
   */
  static checkValidationErrors(req, res, errorMessage = 'バリデーションエラー') {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        message: errorMessage,
        errors: errors.array()
      });
      return true;
    }
    return false;
  }  /**
   * 必須のUUID
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUuid(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return body(fieldName).isUUID().withMessage(message);
  }

  /**
   * オプションのUUID
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUuid(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return body(fieldName).optional().isUUID().withMessage(message);
  }

  /**
   * オプションの配列
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalArray(fieldName, message = `${fieldName}は配列である必要があります`) {
    return body(fieldName).optional().isArray().withMessage(message);
  }

  /**
   * 必須のEnum
   * @param {string} fieldName - フィールド名
   * @param {Array} values - 許可される値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredEnum(fieldName, values, message = `${fieldName}は有効な値である必要があります`) {
    return body(fieldName).isIn(values).withMessage(message);
  }

  /**
   * 時刻フォーマットのバリデーション
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static timeFormat(fieldName, message = `${fieldName}は有効な時刻フォーマットである必要があります`) {
    return body(fieldName).matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage(message);
  }

  /**
   * オプションのBoolean
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalBoolean(fieldName, message = `${fieldName}は真偽値である必要があります`) {
    return body(fieldName).optional().isBoolean().withMessage(message);
  }

  // ================================================================
  // UUID（パラメータ）バリデーション
  // ================================================================

  /**
   * 必須のUUID（パラメータ）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUuidParam(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return param(fieldName).isUUID().withMessage(message);
  }
  /**
   * オプションのUUID（パラメータ）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUuidParam(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return param(fieldName).optional().isUUID().withMessage(message);
  }

  /**
   * 配列内オブジェクトのフィールドバリデーション
   * @param {string} arrayName - 配列名
   * @param {string} fieldName - フィールド名  
   * @param {string} type - バリデーションタイプ（'uuid', 'date', 'float', 'string', 'optional_string'）
   * @param {string} message - エラーメッセージ
   * @param {Object} options - オプション（floatのmin/max等）
   * @returns {ValidationChain}
   */
  static objectArrayField(arrayName, fieldName, type, message, options = {}) {
    const fieldPath = `${arrayName}.*.${fieldName}`;
    let validator = body(fieldPath);

    switch (type) {
      case 'uuid':
        validator = validator.isUUID().withMessage(message);
        break;
      case 'date':
        validator = validator.isISO8601().withMessage(message);
        break;
      case 'float':
        validator = validator.isFloat(options).withMessage(message);
        break;
      case 'string':
        validator = validator.isString().withMessage(message);
        break;
      case 'optional_string':
        validator = validator.optional().isString();
        break;
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }

    return validator;
  }
  /**
   * 文字列ID配列のバリデーション（UUIDの配列）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static stringIdArray(fieldName, message = `${fieldName}は有効なUUIDの配列である必要があります`) {
    return body(`${fieldName}.*`).isUUID().withMessage(message);
  }

  /**
   * 必須のInteger（パラメータ）
   * @param {string} fieldName - フィールド名
   * @param {Object} options - オプション（min/max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredIntParam(fieldName, options = {}, message = `${fieldName}は有効な整数である必要があります`) {
    return param(fieldName).isInt(options).withMessage(message);
  }

  /**
   * オプションのEnum（クエリパラメータ）
   * @param {string} fieldName - フィールド名
   * @param {Array} values - 許可される値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEnumQuery(fieldName, values, message = `${fieldName}は有効な値である必要があります`) {
    return query(fieldName).optional().isIn(values).withMessage(message);
  }

  /**
   * 必須のInteger（クエリパラメータ）
   * @param {string} fieldName - フィールド名
   * @param {Object} options - オプション（min/max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredIntQuery(fieldName, options = {}, message = `${fieldName}は有効な整数である必要があります`) {
    return query(fieldName).isInt(options).withMessage(message);
  }
  /**
   * 必須のUUID（クエリパラメータ）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUuidQuery(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return query(fieldName).isUUID().withMessage(message);
  }

  /**
   * オプションのUUID（クエリパラメータ）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUuidQuery(fieldName, message = `${fieldName}は有効なUUIDである必要があります`) {
    return query(fieldName).optional().isUUID().withMessage(message);
  }

  /**
   * オプションのString（クエリパラメータ）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalStringQuery(fieldName, message = `${fieldName}は有効な文字列である必要があります`) {
    return query(fieldName).optional().isString().withMessage(message);
  }
}

module.exports = CommonValidationRules;
