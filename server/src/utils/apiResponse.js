/**
 * Success envelope, exactly as frozen in API_CONTRACT.md §3:
 *   { "success": true, "data": { }, "message": "optional human string" }
 *
 * Every controller in every later phase must respond through this —
 * never hand-build a success object inline.
 *
 * `pagination`, added in B4, is optional and additive — every existing call
 * site (auth.controller.js etc.) is unaffected since it's a new trailing
 * param. When provided, it's included top-level per contract §3's
 * pagination shape: { page, limit, totalItems, totalPages }.
 */
function apiResponse(res, statusCode, data = {}, message = undefined, pagination = undefined) {
  const body = { success: true, data };
  if (message) body.message = message;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

module.exports = apiResponse;
