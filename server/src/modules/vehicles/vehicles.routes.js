const express = require('express');

const controller = require('./vehicles.controller');
const { protect } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/role.middleware');
const { allowStaffOrInternalService } = require('../../middlewares/internalService.middleware');

const router = express.Router();

// Static sub-path before /:id, per the contract §2 ordering rule.
// §8 GET /vehicles/live — admin
router.get('/live', protect, authorize('admin'), controller.live);

// §8 POST /vehicles — admin
router.post('/', protect, authorize('admin'), controller.create);

// §8 GET /vehicles — staff/admin
router.get('/', protect, authorize('staff', 'admin'), controller.list);

// §8 POST /vehicles/:id/location — staff (Phase 2 driver device) OR simulator (MVP)
router.post('/:id/location', allowStaffOrInternalService, controller.updateLocation);

module.exports = router;
