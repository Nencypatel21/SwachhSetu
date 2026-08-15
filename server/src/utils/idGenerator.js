const Counter = require('../models/Counter');

/**
 * Atomically increments and returns the next sequence number for `key`.
 * Upserts the counter doc if it doesn't exist yet (starts at 1).
 */
async function nextSequence(key) {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

/** RPT-<year>-<4-digit seq>, e.g. RPT-2026-0142. Sequence resets each calendar year. */
async function generateReportId() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`report-${year}`);
  return `RPT-${year}-${String(seq).padStart(4, '0')}`;
}

/** VEH-<3-digit seq>, e.g. VEH-014. */
async function generateVehicleId() {
  const seq = await nextSequence('vehicle');
  return `VEH-${String(seq).padStart(3, '0')}`;
}

/** USR-<seq, starting at 1001>, e.g. USR-1001. */
async function generateUserId() {
  const seq = await nextSequence('user');
  return `USR-${1000 + seq}`;
}

/** ROUTE-<3-digit seq>, e.g. ROUTE-001. */
async function generateRouteId() {
  const seq = await nextSequence('route');
  return `ROUTE-${String(seq).padStart(3, '0')}`;
}

/** LOG-<seq, starting at 3001>, e.g. LOG-3011. */
async function generateAuditLogId() {
  const seq = await nextSequence('auditlog');
  return `LOG-${3000 + seq}`;
}

module.exports = {
  generateReportId,
  generateVehicleId,
  generateUserId,
  generateRouteId,
  generateAuditLogId,
};
