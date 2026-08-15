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

module.exports = router;
