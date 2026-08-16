/**
 * Geo helpers shared by anything that needs straight-line distance between
 * two GeoJSON points. New in B8 (not part of the original B0 utils list) —
 * added here rather than duplicated in routes.service.js because it's a
 * generic building block, same spirit as utils/paginate.js in B4. Flagged
 * in MEMORY_BACKEND.md.
 *
 * Coordinates are always [longitude, latitude] (GeoJSON order), matching
 * the frozen location shape in API_CONTRACT.md §3 — never [lat, lng].
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two [lng, lat] points, in kilometers.
 * This is a straight-line estimate, not a road distance — it's what the
 * `phase1-nearest-neighbour` fallback uses when no real routing engine
 * (OSRM) is configured/reachable (§9).
 */
function haversineKm(coordA, coordB) {
  const [lngA, latA] = coordA;
  const [lngB, latB] = coordB;

  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

module.exports = { haversineKm };
