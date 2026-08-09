// src/utils/AppError.js
// Error terstruktur supaya Global Error Handler tahu status code & pesan
// yang tepat untuk dikembalikan ke client, tanpa menebak-nebak.

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {object} [errors] - detail validasi per field, mis. { drawing_no: 'Required' }
   */
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors) {
    return new AppError(message, 400, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Data not found') {
    return new AppError(message, 404);
  }
  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }
}

module.exports = AppError;
