const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Configuration only — actual upload logic (report images §6, WhatsApp media §11)
// is built in B3/B9. This file exists in B0 purely so those later modules have
// one place to `require('../config/cloudinary')` from, already configured.
if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
} else {
  // Don't crash B0 boot over this — Cloudinary isn't used until B3.
  // But make it loud so nobody wires an upload against a silently-unconfigured SDK.
  console.warn('[cloudinary] not configured — CLOUDINARY_* env vars are missing. Fine for B0, must be set before B3.');
}

module.exports = cloudinary;
