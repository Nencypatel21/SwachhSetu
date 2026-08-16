const express = require('express');

const controller = require('./hotspots.controller');
const { protect } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/role.middleware');

const router = express.Router();

// No `:id` route on this base path, so the §2 static-before-generic
// ordering rule doesn't apply here — both routes below are literal paths.

// §10 GET /hotspots — admin
router.get('/', protect, authorize('admin'), controller.list);

// §10 POST /hotspots/recalculate — admin (cron job path calls the service
// function directly in-process, see jobs/hotspotRecalcJob.js — it never
// hits this HTTP route, so no additional auth path was needed here)
router.post('/recalculate', protect, authorize('admin'), controller.recalculate);

module.exports = router;
