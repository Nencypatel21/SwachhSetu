/**
 * Frozen hotspot risk convention — API_CONTRACT.md §10.
 * New in B7 (not part of the original B1 constants list, which predates the
 * hotspot module) — added here next to reportStatus.js/vehicleStatus.js so
 * this threshold is defined ONCE and never re-derived per layer (RULES.md
 * §3). Flagged in MEMORY_BACKEND.md as an addition.
 *
 *   riskScore: 0.00 - 1.00 (normalized float, always 2 decimal places)
 *   LOW:    0.00 - 0.39
 *   MEDIUM: 0.40 - 0.69
 *   HIGH:   0.70 - 1.00
 */
const RISK_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);

const PREDICTED_BY = Object.freeze({
  XGBOOST: 'phase1-xgboost',
  HEURISTIC: 'phase1-heuristic',
});

/** Maps a 0.00-1.00 riskScore to its frozen riskLevel via the fixed thresholds above. */
function riskLevelFromScore(riskScore) {
  if (riskScore >= 0.7) return 'HIGH';
  if (riskScore >= 0.4) return 'MEDIUM';
  return 'LOW';
}

module.exports = { RISK_LEVELS, PREDICTED_BY, riskLevelFromScore };
