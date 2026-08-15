const express = require('express');

const controller = require('./uploads.controller');
const { singleImageUpload } = require('../../middlewares/upload.middleware');
const { publicWriteLimiter } = require('../../middlewares/rateLimit.middleware');

const router = express.Router();

// §6 POST /uploads/report-image — public, rate-limited, multipart/form-data field "image"
router.post('/report-image', publicWriteLimiter, singleImageUpload, controller.reportImage);

module.exports = router;
