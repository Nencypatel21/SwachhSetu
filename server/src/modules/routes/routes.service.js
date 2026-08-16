const axios = require('axios');

const Route = require('../../models/Route');
const Vehicle = require('../../models/Vehicle');
const Report = require('../../models/Report');
const ApiError = require('../../utils/apiError');
const { haversineKm } = require('../../utils/geo');
const { parsePagination, buildPaginationMeta } = require('../../utils/paginate');
const env = require('../../config/env');

/**
 * §9 Module: Collection Routes. Response/persistence shape is frozen by
 * models/Route.js (B1) — `optimizedBy` is exactly `"osrm-or-tools"` or
 * `"phase1-nearest-neighbour"`, never a third value.
 *
 * **Flagged implementation choice (not yet confirmed by the team, same
 * spirit as B4's two flagged decisions in MEMORY_BACKEND.md):** the
 * "osrm-or-tools" path in this codebase is OSRM road-network distances (via
 * OSRM's Table service) combined with our own nearest-neighbour + 2-opt
 * local-search improvement — NOT a call into the real Google OR-Tools
 * solver library, which isn't installed/available in this environment or
 * timeframe. The response shape and `optimizedBy` tag match the contract
 * exactly either way, and swapping in real OR-Tools bindings later behind
 * `computeOptimizedRoute()` requires zero contract or frontend change
 * (ARCHITECTURE.md §1 principle 5) — but "OR-Tools" in the tag should not
 * be read as a literal claim that OR-Tools is running. With no
 * `OSRM_BASE_URL` configured (the default), every optimize call uses
 * `phase1-nearest-neighbour`, which is the fully-supported contract
 * fallback, not a stub (RULES.md §9).
 */

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRouteResponse(route) {
  return {
    id: route.routeId,
    name: route.name,
    vehicleId: route.vehicleId,
    schedule: route.schedule,
    stops: route.stops,
    baselineDistanceKm: route.baselineDistanceKm,
    optimizedDistanceKm: route.optimizedDistanceKm,
    estimatedTimeMin: route.estimatedTimeMin,
    optimizedBy: route.optimizedBy,
  };
}

async function assertVehicleExists(vehicleId) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) throw new ApiError(404, 'VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} does not exist.`);
  return vehicle;
}

async function assertReportsExist(reportIds) {
  const uniqueIds = [...new Set(reportIds)];
  const found = await Report.find({ reportId: { $in: uniqueIds } }).select('reportId');
  const foundIds = new Set(found.map((r) => r.reportId));
  const missing = uniqueIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ApiError(404, 'REPORT_NOT_FOUND', `Report(s) not found: ${missing.join(', ')}.`);
  }
}

// --- Distance-matrix helpers (shared by both the OSRM and haversine paths) ---

function haversineMatrix(points) {
  const n = points.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = haversineKm(points[i], points[j]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

/** Tries OSRM's Table service for a real road-network distance/duration matrix. Returns null on any failure or if unconfigured — caller falls back to haversine. */
async function fetchOsrmMatrix(points) {
  if (!env.osrm.baseUrl) return null;

  try {
    const coordStr = points.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url = `${env.osrm.baseUrl.replace(/\/$/, '')}/table/v1/driving/${coordStr}?annotations=distance,duration`;
    const { data } = await axios.get(url, { timeout: env.osrm.timeoutMs });

    if (!data || data.code !== 'Ok' || !Array.isArray(data.distances) || !Array.isArray(data.durations)) {
      return null;
    }

    return {
      distanceKm: data.distances.map((row) => row.map((meters) => meters / 1000)),
      durationMin: data.durations.map((row) => row.map((seconds) => seconds / 60)),
    };
  } catch (err) {
    console.warn('[routes] OSRM matrix request failed, falling back to nearest-neighbour:', err.message);
    return null;
  }
}

function pathDistance(matrix, orderWithDepot) {
  let total = 0;
  for (let i = 0; i < orderWithDepot.length - 1; i += 1) {
    total += matrix[orderWithDepot[i]][orderWithDepot[i + 1]];
  }
  return total;
}

/** Greedy nearest-neighbour starting from index 0 (the depot). Returns visiting order of stop indices (1..n-1), depot excluded. */
function nearestNeighbourOrder(matrix) {
  const n = matrix.length;
  const visited = new Array(n).fill(false);
  visited[0] = true;
  let current = 0;
  const order = [];

  for (let step = 1; step < n; step += 1) {
    let best = -1;
    let bestDist = Infinity;
    for (let j = 1; j < n; j += 1) {
      if (!visited[j] && matrix[current][j] < bestDist) {
        bestDist = matrix[current][j];
        best = j;
      }
    }
    visited[best] = true;
    order.push(best);
    current = best;
  }

  return order;
}

/** Local-search improvement over a nearest-neighbour order (depot fixed at position 0). This is the "or-tools"-flavored improvement pass — see the file-level note on what it actually is. */
function twoOptImprove(matrix, orderWithDepot) {
  let best = orderWithDepot.slice();
  let bestDist = pathDistance(matrix, best);
  const n = best.length;
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const candidate = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
        const candidateDist = pathDistance(matrix, candidate);
        if (candidateDist < bestDist - 1e-9) {
          best = candidate;
          bestDist = candidateDist;
          improved = true;
        }
      }
    }
  }

  return { order: best, distanceKm: bestDist };
}

/**
 * Core optimizer. `depot` and `stops[].location` are GeoJSON Points.
 * Returns the exact §9 POST /routes/optimize response fields (minus
 * routeId, which the caller assigns on persistence) plus a `meta` object
 * for non-frozen bookkeeping.
 */
async function computeOptimizedRoute({ depot, stops, capacityKg }) {
  const points = [depot.coordinates, ...stops.map((s) => s.location.coordinates)];

  const osrmResult = await fetchOsrmMatrix(points);
  const matrix = osrmResult ? osrmResult.distanceKm : haversineMatrix(points);
  const optimizedBy = osrmResult ? 'osrm-or-tools' : 'phase1-nearest-neighbour';

  // Baseline: depot -> stops in the order the caller submitted them (a
  // design choice, since the contract's example doesn't define baseline's
  // ordering rule — flagged in MEMORY_BACKEND.md).
  const baselineOrder = points.map((_, idx) => idx);
  const baselineDistanceKm = round(pathDistance(matrix, baselineOrder), 2);

  const nnOrder = nearestNeighbourOrder(matrix);
  const improved = twoOptImprove(matrix, [0, ...nnOrder]);
  const optimizedDistanceKm = round(improved.distanceKm, 2);
  const orderedStopIndices = improved.order.slice(1); // drop the depot (index 0)
  const orderedStops = orderedStopIndices.map((idx) => stops[idx - 1].reportId);

  let estimatedTimeMin;
  if (osrmResult) {
    let totalMin = 0;
    for (let i = 0; i < improved.order.length - 1; i += 1) {
      totalMin += osrmResult.durationMin[improved.order[i]][improved.order[i + 1]];
    }
    estimatedTimeMin = Math.round(totalMin);
  } else {
    estimatedTimeMin = Math.round((optimizedDistanceKm / env.routing.averageSpeedKmph) * 60);
  }

  const totalLoadKg = stops.reduce((sum, s) => sum + (s.estimatedLoadKg || 0), 0);
  const capacityExceeded = typeof capacityKg === 'number' && totalLoadKg > capacityKg;

  return {
    orderedStops,
    baselineDistanceKm,
    optimizedDistanceKm,
    estimatedTimeMin,
    optimizedBy,
    meta: { totalLoadKg, capacityExceeded },
  };
}

/** §9 POST /routes — Role: admin. Manual route, caller supplies the stop order directly (no optimization run). */
async function createRoute({ name, vehicleId, schedule, stops }) {
  await assertVehicleExists(vehicleId);
  await assertReportsExist(stops.map((s) => s.reportId));

  const route = await Route.create({
    name,
    vehicleId,
    schedule: schedule || null,
    stops: stops.map((s) => ({ reportId: s.reportId, sequence: s.sequence })),
  });

  return toRouteResponse(route);
}

/** §9 GET /routes — Role: staff/admin. Optional ?vehicleId= filter, paginated. */
async function listRoutes(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.vehicleId) filter.vehicleId = query.vehicleId;

  const [items, totalItems] = await Promise.all([
    Route.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Route.countDocuments(filter),
  ]);

  return {
    items: items.map(toRouteResponse),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

/** §9 GET /routes/:id — Role: staff/admin. */
async function getRouteById(routeId) {
  const route = await Route.findOne({ routeId });
  if (!route) throw new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${routeId} does not exist.`);
  return toRouteResponse(route);
}

/** §9 PATCH /routes/:id — Role: admin. Partial update; every field optional. */
async function updateRoute(routeId, updates) {
  const route = await Route.findOne({ routeId });
  if (!route) throw new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${routeId} does not exist.`);

  if (updates.vehicleId !== undefined) {
    await assertVehicleExists(updates.vehicleId);
    route.vehicleId = updates.vehicleId;
  }
  if (updates.stops !== undefined) {
    await assertReportsExist(updates.stops.map((s) => s.reportId));
    route.stops = updates.stops.map((s) => ({ reportId: s.reportId, sequence: s.sequence }));
  }
  if (updates.name !== undefined) route.name = updates.name;
  if (updates.schedule !== undefined) route.schedule = updates.schedule;

  await route.save();
  return toRouteResponse(route);
}

/**
 * §9 POST /routes/optimize — Role: admin. Computes AND persists a Route
 * document (routeId is generated the same way every other model does, see
 * MEMORY_BACKEND.md "Design decisions") — the contract's example response
 * includes a `routeId`, which only makes sense if this call creates a
 * record an admin can later GET /routes/:id to revisit.
 */
async function optimizeRoute({ depot, vehicleId, capacityKg, stops }) {
  await assertVehicleExists(vehicleId);
  await assertReportsExist(stops.map((s) => s.reportId));

  const result = await computeOptimizedRoute({ depot, stops, capacityKg });

  const route = await Route.create({
    name: `Auto-optimized route for ${vehicleId} (${new Date().toISOString()})`,
    vehicleId,
    schedule: null,
    stops: result.orderedStops.map((reportId, idx) => ({ reportId, sequence: idx + 1 })),
    baselineDistanceKm: result.baselineDistanceKm,
    optimizedDistanceKm: result.optimizedDistanceKm,
    estimatedTimeMin: result.estimatedTimeMin,
    optimizedBy: result.optimizedBy,
    meta: result.meta,
  });

  return {
    routeId: route.routeId,
    orderedStops: result.orderedStops,
    baselineDistanceKm: result.baselineDistanceKm,
    optimizedDistanceKm: result.optimizedDistanceKm,
    estimatedTimeMin: result.estimatedTimeMin,
    optimizedBy: result.optimizedBy,
  };
}

module.exports = {
  createRoute,
  listRoutes,
  getRouteById,
  updateRoute,
  optimizeRoute,
  // Exported for unit testing the pure algorithm without a DB/HTTP stack:
  _internal: { haversineMatrix, nearestNeighbourOrder, twoOptImprove, pathDistance, computeOptimizedRoute },
};
