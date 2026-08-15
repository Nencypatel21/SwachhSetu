const env = require('./env');

// Stub only — per PHASES.md, B0 scaffolds config, B9 builds the actual
// GET verification route and POST webhook handler (contract §11).
// This file just centralizes the three values that module will need,
// so B9 doesn't have to touch config/env.js again.

const whatsappConfig = {
  verifyToken: env.whatsapp.verifyToken,
  accessToken: env.whatsapp.accessToken,
  phoneNumberId: env.whatsapp.phoneNumberId,
  isConfigured: Boolean(
    env.whatsapp.verifyToken && env.whatsapp.accessToken && env.whatsapp.phoneNumberId
  ),
};

if (!whatsappConfig.isConfigured) {
  // WhatsApp is explicitly non-blocking for MVP (§11) — warn, don't crash B0 boot.
  console.warn('[whatsapp] not configured — WHATSAPP_* env vars are missing. Fine until B9.');
}

module.exports = whatsappConfig;
