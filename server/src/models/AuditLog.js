const mongoose = require('mongoose');

const { generateAuditLogId } = require('../utils/idGenerator');

/**
 * AuditLog model — API_CONTRACT.md §15.
 * ```json
 * { "id": "LOG-3011", "type": "Reports", "message": "RPT-2026-0142 → COLLECTED by Rahul Mehta", "timestamp": "..." }
 * ```
 * `timestamp` is stored as an explicit field (not just relying on Mongoose's
 * default `createdAt`) because the contract's own example names it
 * `timestamp` — field naming must match end to end (§3, RULES.md §3).
 * `logId` is this project's human-readable ID (see MEMORY_BACKEND.md); the
 * contract's own example calls the same value `id`, which — like the
 * report/user id-naming note elsewhere in this codebase — is a
 * response-serialization decision for whichever phase builds the
 * `GET /audit-logs` controller (B11), not a modeling concern here.
 */
const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  // User.userId of whoever performed the logged action, if known.
  actorId: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

auditLogSchema.pre('validate', async function preValidate(next) {
  try {
    if (this.isNew && !this.logId) {
      this.logId = await generateAuditLogId();
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
