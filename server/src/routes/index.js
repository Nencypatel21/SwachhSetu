const express = require('express');
const apiResponse = require('../utils/apiResponse');

const router = express.Router();

/**
 * Health check only. This is the one route B0 is allowed to add
 * (see PHASES.md B0 "Do NOT touch"). Every real module (auth, reports,
 * vehicles, ...) mounts its own router here starting in B2 — e.g.:
 *   router.use('/auth', require('../modules/auth/auth.routes'));
 * Nothing beyond that pattern belongs in this file; keep it a thin
 * aggregator, not a place business logic accumulates.
 */
router.get('/health', (req, res) => {
  apiResponse(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/reports', require('../modules/reports/reports.routes'));
router.use('/uploads', require('../modules/uploads/uploads.routes'));
router.use('/vehicles', require('../modules/vehicles/vehicles.routes'));
router.use('/hotspots', require('../modules/hotspots/hotspots.routes'));
router.use('/routes', require('../modules/routes/routes.routes'));

module.exports = router;
