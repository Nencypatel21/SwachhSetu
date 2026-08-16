const express = require('express');

const controller = require('./routes.controller');
const { protect } = require('../../middlewares/auth.middleware');
const authorize = require('../../middlewares/role.middleware');

const router = express.Router();

// `/optimize` is registered before `/:id` — same §2 static-before-generic
// convention as reports/vehicles, even though there's no actual literal
// clash here (optimize is POST-only, :id only appears on GET/PATCH), so
// it's a defensive/consistency choice, not a required fix.

// §9 POST /routes/optimize — admin. Computes AND persists a Route.
router.post('/optimize', protect, authorize('admin'), controller.optimize);

// §9 POST /routes — admin. Manual route creation.
router.post('/', protect, authorize('admin'), controller.create);

// §9 GET /routes — staff/admin
router.get('/', protect, authorize('staff', 'admin'), controller.list);

// §9 GET /routes/:id — staff/admin
router.get('/:id', protect, authorize('staff', 'admin'), controller.getById);

// §9 PATCH /routes/:id — admin
router.patch('/:id', protect, authorize('admin'), controller.update);

module.exports = router;
