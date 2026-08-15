/**
 * Wraps an async Express route/controller so any thrown error or rejected
 * promise is passed to next(err) automatically, instead of every controller
 * needing its own try/catch. Every controller from B2 onward should be
 * wrapped in this.
 *
 * Usage: router.post('/reports', asyncHandler(reportsController.create));
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
