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

  // B6 — vehicle simulator cron job. Self-calls this server's own
  // POST /vehicles/:id/location over HTTP (see jobs/vehicleSimulator.js),
  // using `internalServiceKey` above for auth. Disabled automatically if
  // internalServiceKey is unset (nothing to authenticate with). `baseUrl`
  // defaults to the server's own loopback address; override only if the
  // process can't reach itself at localhost:PORT (e.g. some container
  // setups) — not contract-specified, MVP default.
  simulator: {
    enabled: process.env.SIMULATOR_ENABLED !== 'false',
    intervalSeconds: Number(process.env.SIMULATOR_INTERVAL_SECONDS) || 10,
    baseUrl: process.env.SIMULATOR_BASE_URL || null, // resolved against `port` at call time if null
    centerLng: Number(process.env.SIMULATOR_CENTER_LNG) || 72.5714,
    centerLat: Number(process.env.SIMULATOR_CENTER_LAT) || 23.0225,
    radiusKm: Number(process.env.SIMULATOR_RADIUS_KM) || 8,
  },

  // B8 — optional OSRM instance for road-network distances/durations (§9
  // primary path). Unset by default: with no OSRM_BASE_URL, route
  // optimization always uses the `phase1-nearest-neighbour` fallback, which
  // is a fully contract-supported first-class path, not a stub (RULES.md §9).
  osrm: {
    baseUrl: process.env.OSRM_BASE_URL || null,
    timeoutMs: Number(process.env.OSRM_TIMEOUT_MS) || 4000,
  },
  routing: {
    // Used to derive estimatedTimeMin when OSRM's own duration matrix isn't
    // available (fallback path). MVP default for urban stop-and-go
    // collection driving, not contract-specified.
    averageSpeedKmph: Number(process.env.ROUTE_AVERAGE_SPEED_KMPH) || 20,
  },

  // B7 — periodic hotspot recalculation cron (ARCHITECTURE.md §2 lists this
  // as one of the cron jobs alongside vehicle-sim tick). Runs
  // hotspots.service.recalculateHotspots() in-process — no HTTP self-call
  // and no internal-service auth needed, unlike B6, since it isn't crossing
  // the API boundary (see jobs/hotspotRecalcJob.js).
  hotspot: {
    enabled: process.env.HOTSPOT_RECALC_ENABLED !== 'false',
    recalcCron: process.env.HOTSPOT_RECALC_CRON || '*/15 * * * *',
  },
};
