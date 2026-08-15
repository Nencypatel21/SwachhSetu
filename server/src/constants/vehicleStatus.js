/**
 * Frozen vehicle status enum — API_CONTRACT.md §8.
 * Exactly these six uppercase values, DB/API/frontend alike. The frontend may
 * map these to display labels ("On Route", "Under maintenance") for UI, but
 * the stored/transmitted value is always one of the six below — never a label.
 */
const VEHICLE_STATUSES = Object.freeze([
  'IDLE',
  'ASSIGNED',
  'EN_ROUTE',
  'COLLECTING',
  'MAINTENANCE',
  'OFFLINE',
]);

module.exports = { VEHICLE_STATUSES };
