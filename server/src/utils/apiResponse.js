/**
 * Success envelope, exactly as frozen in API_CONTRACT.md §3:
 *   { "success": true, "data": { }, "message": "optional human string" }
 *
 * Every controller in every later phase must respond through this —
 * never hand-build a success object inline.
 */
function apiResponse(res, statusCode, data = {}, message = undefined) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

module.exports = apiResponse;
