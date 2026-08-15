const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Configuration only — actual upload logic lives in modules/uploads/uploads.service.js
// (B3) and is reused internally by modules/integrations/whatsapp (B9, not yet built).
// CLOUDINARY_* is required in env.js as of B3, so the else branch below is now a
// defensive guard rather than an expected MVP-boot path — kept in case env.js's
// required list is ever relaxed again.
if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
} else {
  console.warn('[cloudinary] not configured — CLOUDINARY_* env vars are missing.');
}

module.exports = cloudinary;
