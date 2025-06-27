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
  }

  /**
   * オプションの文字列フィールド
   * @param {string} fieldName - フィールド名
   * @returns {ValidationChain}
   */
  static optionalString(fieldName) {
    return body(fieldName).optional().trim();
  }

  /**
   * 必須のメールアドレス
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredEmail(fieldName, message = `${fieldName}は有効なメールアドレスである必要があります`) {
    return body(fieldName).trim().notEmpty().isEmail().withMessage(message);
  }

  /**
   * オプションのメールアドレス
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEmail(fieldName, message = `${fieldName}は有効なメールアドレスである必要があります`) {
    return body(fieldName).optional().trim().isEmail().withMessage(message);
  }

  /**
   * 必須のURL
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUrl(fieldName, message = `${fieldName}は有効なURLである必要があります`) {
    return body(fieldName).trim().notEmpty().isURL().withMessage(message);
  }

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
  // 真偽値バリデーション
  // ================================================================

  /**
   * 必須のブール値
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredBoolean(fieldName, message = `${fieldName}は真偽値である必要があります`) {
    return body(fieldName).isBoolean().withMessage(message);
  }

  /**
   * オプションのブール値
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalBoolean(fieldName, message = `${fieldName}はtrue/falseである必要があります`) {
    return body(fieldName).optional().isBoolean().withMessage(message);
  }

  // ================================================================
  // 数値バリデーション  
  // ================================================================

  /**
   * 必須のパーセンテージ（0-100）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredPercentage(fieldName, message = `${fieldName}は0から100の間の数値である必要があります`) {
    return body(fieldName).isFloat({ min: 0, max: 100 }).withMessage(message);
  }

  /**
   * パーセンテージ（requiredPercentageの別名）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static percentage(fieldName, message = `${fieldName}は0から100の間の数値である必要があります`) {
    return body(fieldName).isFloat({ min: 0, max: 100 }).withMessage(message);
  }

  /**
   * オプションのパーセンテージ
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalPercentage(fieldName, message = `${fieldName}は0から100の間の数値である必要があります`) {
    return body(fieldName).optional().isFloat({ min: 0, max: 100 }).withMessage(message);
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

  /**
   * サブスクリプションプラン
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static subscriptionPlan(fieldName = 'plan', message = 'プランは必須です') {
    return body(fieldName).notEmpty().isIn(['BASIC', 'PRO', 'ENTERPRISE']).withMessage(message);
  }

  /**
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

  // ================================================================
  // パラメータバリデーション
  // ================================================================

  /**
   * 必須のUUIDパラメータ
   * @param {string} paramName - パラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUuidParam(paramName, message = `${paramName}は有効なUUIDである必要があります`) {
    return param(paramName).isUUID().withMessage(message);
  }

  /**
   * オプションのUUIDパラメータ
   * @param {string} paramName - パラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUuidParam(paramName, message = `${paramName}は有効なUUIDである必要があります`) {
    return param(paramName).optional().isUUID().withMessage(message);
  }

  /**
   * 必須の整数パラメータ
   * @param {string} paramName - パラメータ名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredIntParam(paramName, options = {}, message = `${paramName}は有効な整数である必要があります`) {
    return param(paramName).isInt(options).withMessage(message);
  }

  /**
   * オプションの整数パラメータ
   * @param {string} paramName - パラメータ名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalIntParam(paramName, options = {}, message = `${paramName}は有効な整数である必要があります`) {
    return param(paramName).optional().isInt(options).withMessage(message);
  }

  // ================================================================
  // 日付・時刻バリデーション
  // ================================================================

  /**
   * 必須の日付フィールド
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredDate(fieldName, message = `${fieldName}は有効な日付である必要があります`) {
    return body(fieldName).isISO8601().toDate().withMessage(message);
  }

  /**
   * オプションの日付クエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalDateQuery(queryName, message = `${queryName}は有効な日付である必要があります`) {
    return query(queryName).optional().isISO8601().withMessage(message);
  }

  /**
   * オプションの整数クエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalIntQuery(queryName, options = {}, message = `${queryName}は有効な整数である必要があります`) {
    return query(queryName).optional().isInt(options).withMessage(message);
  }

  /**
   * オプションの文字列クエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalStringQuery(queryName, message = `${queryName}は文字列である必要があります`) {
    return query(queryName).optional().isString().withMessage(message);
  }

  /**
   * オプションの列挙型クエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {Array} validValues - 有効な値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEnumQuery(queryName, validValues, message = `${queryName}は有効な値である必要があります`) {
    return query(queryName).optional().isIn(validValues).withMessage(message);
  }

  /**
   * オプションのUUIDクエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalUuidQuery(queryName, message = `${queryName}は有効なUUIDである必要があります`) {
    return query(queryName).optional().isUUID().withMessage(message);
  }

  /**
   * 必須のUUIDクエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredUuidQuery(queryName, message = `${queryName}は有効なUUIDである必要があります`) {
    return query(queryName).isUUID().withMessage(message);
  }

  /**
   * 必須のCUIDクエリパラメータ
   * @param {string} queryName - クエリパラメータ名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredCuidQuery(queryName, message = `${queryName}は有効なCUIDである必要があります`) {
    return query(queryName)
      .isString()
      .matches(/^c[a-z0-9]{24}$/)
      .withMessage(message);
  }

  /**
   * スキルレベル（数値）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static skillLevelNumeric(fieldName = 'level', message = 'レベルは1-5の値である必要があります') {
    return body(fieldName).isInt({ min: 1, max: 5 }).withMessage(message);
  }

  /**
   * 経験年数
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static experienceYears(fieldName = 'experienceYears', message = '経験年数は0以上の数値である必要があります') {
    return body(fieldName).optional().isInt({ min: 0 }).withMessage(message);
  }

  /**
   * スキルレベル（汎用）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static skillLevel(fieldName = 'level', message = 'レベルは1-5の値である必要があります') {
    return body(fieldName).isInt({ min: 1, max: 5 }).withMessage(message);
  }

  /**
   * 年数（汎用）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static years(fieldName = 'years', message = '年数は0以上の数値である必要があります') {
    return body(fieldName).optional().isInt({ min: 0 }).withMessage(message);
  }

  /**
   * 時刻フォーマット（HH:MM）
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static timeFormat(fieldName, message = `${fieldName}は有効な時刻フォーマット（HH:MM）である必要があります`) {
    return body(fieldName).matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage(message);
  }

  // ================================================================
  // 数値バリデーション（追加）
  // ================================================================

  /**
   * 必須の整数
   * @param {string} fieldName - フィールド名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredInt(fieldName, options = {}, message = `${fieldName}は整数である必要があります`) {
    return body(fieldName).isInt(options).withMessage(message);
  }

  /**
   * オプションの整数
   * @param {string} fieldName - フィールド名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalInt(fieldName, options = {}, message = `${fieldName}は整数である必要があります`) {
    return body(fieldName).optional().isInt(options).withMessage(message);
  }

  /**
   * 必須のクエリ整数
   * @param {string} queryName - クエリパラメータ名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredIntQuery(queryName, options = {}, message = `${queryName}は整数である必要があります`) {
    return query(queryName).isInt(options).withMessage(message);
  }

  /**
   * 必須の浮動小数点数
   * @param {string} fieldName - フィールド名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredFloat(fieldName, options = {}, message = `${fieldName}は数値である必要があります`) {
    return body(fieldName).isFloat(options).withMessage(message);
  }

  /**
   * オプションの浮動小数点数
   * @param {string} fieldName - フィールド名
   * @param {object} options - オプション（min, max）
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalFloat(fieldName, options = {}, message = `${fieldName}は数値である必要があります`) {
    return body(fieldName).optional().isFloat(options).withMessage(message);
  }

  /**
   * オプションの日付フィールド
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalDate(fieldName, message = `${fieldName}は有効な日付である必要があります`) {
    return body(fieldName).optional().isISO8601().toDate().withMessage(message);
  }

  /**
   * 必須の配列
   * @param {string} fieldName - フィールド名
   * @param {string} message - エラーメッセージ
   * @param {object} options - 配列の長さ制限等
   * @returns {ValidationChain}
   */
  static requiredArray(fieldName, message = `${fieldName}は配列である必要があります`, options = {}) {
    const validator = body(fieldName).isArray(options).withMessage(message);
    return validator;
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
  static stringIdArray(fieldName, message = `${fieldName}は有効な文字列IDの配列である必要があります`) {
    return body(fieldName)
      .isArray()
      .custom((arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.every(item => typeof item === 'string' && item.length > 0);
      })
      .withMessage(message);
  }

  // ================================================================
  // 列挙型バリデーション
  // ================================================================

  /**
   * オプションの列挙型
   * @param {string} fieldName - フィールド名
   * @param {Array} validValues - 有効な値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static optionalEnum(fieldName, validValues, message = `${fieldName}は有効な値である必要があります`) {
    return body(fieldName).optional().isIn(validValues).withMessage(message);
  }

  /**
   * 必須の列挙型
   * @param {string} fieldName - フィールド名
   * @param {Array} validValues - 有効な値の配列
   * @param {string} message - エラーメッセージ
   * @returns {ValidationChain}
   */
  static requiredEnum(fieldName, validValues, message = `${fieldName}は有効な値である必要があります`) {
    return body(fieldName).notEmpty().isIn(validValues).withMessage(message);
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
   */  static handleValidationErrors(req, errorMessage = 'バリデーションエラー') {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // デバッグ用: 詳細なエラー情報をログ出力
      console.error('Validation errors:', JSON.stringify(errors.array(), null, 2));
      console.error('Request body:', JSON.stringify(req.body, null, 2));
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
  }
}

module.exports = CommonValidationRules;
