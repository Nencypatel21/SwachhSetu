const express = require('express');

const controller = require('./reports.controller');
const { protect, attachUserIfPresent } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/role.middleware');
const { publicWriteLimiter, publicActionLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

// --- Static/specific sub-paths FIRST — contract §2 route-ordering rule.
// Express matches top-down; if /:id were registered before these, it would
// shadow "heatmap", "track", "my", and "assigned-to-me" as if they were IDs.

// §7 GET /reports/heatmap — admin
router.get('/heatmap', protect, authorize('admin'), controller.heatmap);

// §5.3 GET /reports/track/:id — public
router.get('/track/:id', controller.track);

// §5.4 GET /reports/my — citizen (optional-account holders)
router.get('/my', protect, authorize('citizen'), controller.my);

// §7 GET /reports/assigned-to-me — staff
router.get('/assigned-to-me', protect, authorize('staff'), controller.assignedToMe);

// --- Root-level ---

// §5.1 POST /reports — public, optionally linked to a citizen account
router.post('/', publicWriteLimiter, attachUserIfPresent, controller.create);

// §7 GET /reports — staff/admin, filtered list
router.get('/', protect, authorize('staff', 'admin'), controller.list);

// --- /:id and its sub-paths — generic, always last on this base path ---

// §5.7 POST /reports/:id/feedback — public via trackingToken
router.post('/:id/feedback', publicActionLimiter, controller.feedback);

// §5.6 PATCH /reports/:id/status — staff/admin (transition table enforced in service)
router.patch('/:id/status', protect, authorize('staff', 'admin'), controller.updateStatus);

// §7 PATCH /reports/:id/assign — admin
router.patch('/:id/assign', protect, authorize('admin'), controller.assign);

// §5.5 GET /reports/:id — staff/admin, full internal detail
router.get('/:id', protect, authorize('staff', 'admin'), controller.getById);

// §5.8 DELETE /reports/:id — public via trackingToken, only while REPORTED
router.delete('/:id', publicActionLimiter, controller.remove);

module.exports = router;
