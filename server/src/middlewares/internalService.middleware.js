const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { verifyAccessTokenSafe } = require('./auth.middleware');

/**
 * API_CONTRACT.md §8: POST /vehicles/:id/location is `Role: staff` in Phase 2
 * (a real driver device, authenticated normally) but "simulator job only" in
 * MVP. The simulator (B6, not yet built) is a cron job, not a logged-in
 * staff member, so it can't hold a staff JWT — flagged during the
 * architecture review and in PHASES.md's B6 note.
 *
 * This middleware accepts EITHER:
 *   - a valid staff/admin Bearer token (the Phase 2 path, works unchanged), OR
 *   - a matching `x-internal-key` header (the MVP simulator path)
 * and rejects anything else. B6 just needs to send `x-internal-key:
 * <INTERNAL_SERVICE_KEY>` — no other change to this endpoint required later.
 */
function allowStaffOrInternalService(req, res, next) {
  const serviceKey = req.headers['x-internal-key'];
  if (serviceKey && env.internalServiceKey && serviceKey === env.internalServiceKey) {
    req.isInternalService = true;
    return next();
  }

  const decoded = verifyAccessTokenSafe(req);
  if (decoded && ['staff', 'admin'].includes(decoded.role)) {
    req.user = { userId: decoded.userId, mongoId: decoded.mongoId, role: decoded.role };
    return next();
  }

  return next(
    new ApiError(401, 'UNAUTHORIZED', 'Requires staff/admin authentication or a valid internal service key.')
  );
}

module.exports = { allowStaffOrInternalService };
