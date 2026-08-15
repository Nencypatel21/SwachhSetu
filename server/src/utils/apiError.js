/**
 * Thrown from anywhere in the app (controllers, services, middlewares).
 * Caught by middlewares/error.middleware.js, which turns it into the
 * exact error envelope frozen in API_CONTRACT.md §3:
 *   { "success": false, "error": { "code": "...", "message": "..." } }
 *
 * Usage: throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report does not exist');
 */
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
