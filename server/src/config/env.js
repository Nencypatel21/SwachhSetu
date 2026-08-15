// Single place every other file gets env vars from — never call process.env directly
// anywhere else in the codebase. This is what makes it obvious when a required
// var is missing, instead of failing with a confusing error three layers deep.

require('dotenv').config();

const required = ['MONGODB_URI'];
// NOTE: JWT_*, CLOUDINARY_*, WHATSAPP_* become required once their modules go
// live (B2, B3, B9). Kept optional here in B0 so scaffolding can boot with a
// partially-filled .env — do not silently start treating them as optional
// forever, revisit this list when those phases start.

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
    accessSecret: process.env.JWT_ACCESS_SECRET || null,
    refreshSecret: process.env.JWT_REFRESH_SECRET || null,
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
};
