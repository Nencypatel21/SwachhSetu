// Single place every other file gets env vars from — never call process.env directly
// anywhere else in the codebase. This is what makes it obvious when a required
// var is missing, instead of failing with a confusing error three layers deep.

require('dotenv').config();

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
// NOTE: JWT_* became required in B2 (auth module went live).
// CLOUDINARY_* became required in B3 (uploads module went live) — this is
// the revisit B0's original comment called for.
// WHATSAPP_* still becomes required once B9 goes live — don't add it here
// until then. INTERNAL_SERVICE_KEY (below) is intentionally NOT in this
// required list: B5's vehicle-location endpoint also accepts a real staff
// JWT, so a missing key degrades to "simulator path unavailable" rather
// than blocking boot — see internalService.middleware.js.

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Fail loudly at boot, not on the first request that needs the var.
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongodbUri: process.env.MONGODB_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    apiKey: process.env.CLOUDINARY_API_KEY || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET || null,
  },

  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || null,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || null,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
  },

  // B5 — simulator (B6) auth path for POST /vehicles/:id/location. Optional
  // by design; see the required-list note above.
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || null,
};
