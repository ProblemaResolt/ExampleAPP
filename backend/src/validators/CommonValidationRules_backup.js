const { body, query, param, validationResult } = require('express-validator');
const { AppError } = require('../middleware/error');

/**
 * 共通バリデーションルール (backup)
 */
class CommonValidationRules {
  // テスト用の最小限のメソッド
  static requiredString(fieldName, message = `${fieldName}は必須です`) {
    return body(fieldName).trim().notEmpty().withMessage(message);
  }

  static handleValidationErrors(req, errorMessage = 'バリデーションエラー') {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errorMessage, 400, errors.array());
    }
  }
}

module.exports = CommonValidationRules;
