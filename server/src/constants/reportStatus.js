/**
 * Frozen report status lifecycle — API_CONTRACT.md §5.2.
 * Uppercase, exact spelling, defined ONCE here and referenced everywhere
 * (Report model, status-transition validation in B4, frontend constants).
 * Never hardcode these strings anywhere else — import from this file.
 *
 *   REPORTED → REVIEWED → PRIORITIZED → ASSIGNED → EN_ROUTE → ARRIVED → COLLECTED → RESOLVED
 *                                                                                 ↘ REJECTED (terminal, from any non-RESOLVED state)
 */
const REPORT_STATUSES = Object.freeze([
  'REPORTED',
  'REVIEWED',
  'PRIORITIZED',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'COLLECTED',
  'RESOLVED',
  'REJECTED',
]);

/**
 * Allowed transitions and the exact role(s) permitted for EACH one (contract §5.2 table).
 * B4 (PATCH /reports/:id/status) enforces this server-side — defined here now,
 * next to the enum, so B4 doesn't need to re-derive it from the contract text.
 *
 * Structure: FROM_STATUS -> { TO_STATUS: [allowed roles] }
 * Note the per-transition (not per-FROM-status) role list is required: e.g. from
 * ASSIGNED, staff-only can move to EN_ROUTE, but only admin can reject the same
 * report — collapsing these into one role list per FROM status would wrongly let
 * staff reject, or wrongly block admin's blanket reject-from-anywhere power.
 */
const REPORT_STATUS_TRANSITIONS = Object.freeze({
  REPORTED: {
    REVIEWED: ['staff', 'admin'],
    REJECTED: ['admin'],
  },
  REVIEWED: {
    PRIORITIZED: ['admin'],
    REJECTED: ['admin'],
  },
  PRIORITIZED: {
    ASSIGNED: ['admin'],
    REJECTED: ['admin'],
  },
  ASSIGNED: {
    EN_ROUTE: ['staff'],
    REJECTED: ['admin'],
  },
  EN_ROUTE: {
    ARRIVED: ['staff'],
    REJECTED: ['admin'],
  },
  ARRIVED: {
    COLLECTED: ['staff'],
    REJECTED: ['admin'],
  },
  COLLECTED: {
    RESOLVED: ['staff', 'admin'],
    REJECTED: ['admin'],
  },
  RESOLVED: {},
  REJECTED: {},
});

module.exports = { REPORT_STATUSES, REPORT_STATUS_TRANSITIONS };
