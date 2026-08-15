const ApiError = require('../utils/apiError');
const env = require('../config/env');

/**
 * Single global error handler — must be the LAST app.use() in app.js.
 * Produces the exact error envelope frozen in API_CONTRACT.md §3:
 *   { "success": false, "error": { "code": "...", "message": "..." } }
 *
 * Handles two cases:
 *   1. A known ApiError thrown deliberately (404, 403, 409, etc.)
 *   2. An unexpected error (bug, DB hiccup, etc.) — logged in full,
 *      but never leaks stack traces/internals to the client.
 */
function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Unexpected error — log full detail server-side, return a generic 500 to the client.
  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.nodeEnv === 'development' ? err.message : 'Something went wrong. Please try again.',
    },
  });
}

module.exports = errorMiddleware;
