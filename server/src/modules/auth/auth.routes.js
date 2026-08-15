const express = require('express');

const controller = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

// §4 — all public/no-role-gate except logout and me, which require a valid session.
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', protect, controller.logout);
router.get('/me', protect, controller.me);

module.exports = router;
