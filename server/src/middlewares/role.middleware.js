const ApiError = require('../utils/apiError');

/**
 * Role-gate factory. Must run AFTER auth.middleware.js's `protect` so
 * req.user already exists. Usage:
 *   router.get('/reports', protect, authorize('staff', 'admin'), controller);
 *
 * Only public/citizen/staff/admin exist in Phase 1 (contract §1, RULES.md §4)
 * — 'public' is never passed here since public routes don't use `protect` at
 * all. Never check for or reference any other role string (e.g. 'supervisor').
 */
function authorize(...allowedRoles) {
  return function roleCheck(req, res, next) {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'FORBIDDEN', `Role '${req.user.role}' is not permitted to perform this action.`)
      );
    }
    return next();
  };
}

module.exports = authorize;
