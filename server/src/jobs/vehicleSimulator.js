const cron = require('node-cron');
const axios = require('axios');

const env = require('../config/env');
const Vehicle = require('../models/Vehicle');

/**
 * B6 — Vehicle simulator. API_CONTRACT.md §8 / ARCHITECTURE.md §2 & §7:
 * MVP has no real GPS hardware, so this cron job fabricates movement and
 * writes it through the EXACT SAME contract endpoint a Phase 2 driver
 * device would call — POST /vehicles/:id/location — rather than writing to
 * the DB directly. That's deliberate: it's what lets the vehicles module
 * (B5) stay completely unaware that its caller is a simulator, and it's why
 * this file is not allowed to touch `modules/vehicles/*` (PHASES.md B6 "Do
 * NOT touch").
 *
 * Auth: sends `x-internal-key: <INTERNAL_SERVICE_KEY>`, which
 * `middlewares/internalService.middleware.js` (built in B5, specifically
 * anticipating this file) already accepts. If INTERNAL_SERVICE_KEY isn't
 * set, the simulator can't authenticate at all — it logs a warning once and
 * never starts, rather than hammering the endpoint with requests that will
 * always 401.
 *
 * Movement model (flagged design choice — not contract-specified, see
 * MEMORY_BACKEND.md): every tick, each vehicle NOT in `OFFLINE` or
 * `MAINTENANCE` takes one random-walk step from its last known position
 * (or is seeded near the configured city center if it has none yet),
 * clamped to a radius around that center so it doesn't wander off
 * indefinitely. `speedKmph` is randomized within a band that depends on
 * whether the vehicle is actively moving (`EN_ROUTE`) vs idling/collecting.
 */

const STEP_KM = 0.15; // ~150m per tick — small enough to look like continuous movement at a 10s default interval
const KM_PER_DEG_LAT = 111.32; // ~constant everywhere

let task = null;

function kmToDegLat(km) {
  return km / KM_PER_DEG_LAT;
}

function kmToDegLng(km, atLat) {
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos(toRad(atLat));
  return kmPerDegLng > 0 ? km / kmPerDegLng : 0;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceFromCenterKm([lng, lat]) {
  const dLat = (lat - env.simulator.centerLat) * KM_PER_DEG_LAT;
  const dLng = (lng - env.simulator.centerLng) * KM_PER_DEG_LAT * Math.cos(toRad(env.simulator.centerLat));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** One random-walk step from `from`, biased back toward the center once near the radius edge. */
function nextPosition(from) {
  const [lng, lat] = from;
  const headingOutOfBounds = distanceFromCenterKm(from) >= env.simulator.radiusKm;

  // Bias the random heading back toward center if we've drifted to the edge;
  // otherwise pick a uniformly random direction — a simple, honest random
  // walk, not a real road-network path (that's what OSRM/real GPS give you
  // in Phase 2; see ARCHITECTURE.md §1 principle 5).
  let angle = Math.random() * 2 * Math.PI;
  if (headingOutOfBounds) {
    const angleToCenter = Math.atan2(
      env.simulator.centerLat - lat,
      env.simulator.centerLng - lng
    );
    angle = angleToCenter + (Math.random() - 0.5) * (Math.PI / 2); // toward center, +/- 45°
  }

  const newLat = lat + kmToDegLat(STEP_KM) * Math.sin(angle);
  const newLng = lng + kmToDegLng(STEP_KM, lat) * Math.cos(angle);
  return [Number(newLng.toFixed(6)), Number(newLat.toFixed(6))];
}

function seedPosition() {
  // First-ever ping for a vehicle with no currentLocation: place it at a
  // random point within the radius of the configured city center.
  const angle = Math.random() * 2 * Math.PI;
  const radiusKm = Math.random() * env.simulator.radiusKm * 0.5; // stay well inside the bound
  const lat = env.simulator.centerLat + kmToDegLat(radiusKm) * Math.sin(angle);
  const lng = env.simulator.centerLng + kmToDegLng(radiusKm, env.simulator.centerLat) * Math.cos(angle);
  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function randomSpeedKmph(status) {
  if (status === 'EN_ROUTE') return Math.round(15 + Math.random() * 25); // 15-40
  if (status === 'COLLECTING') return Math.round(Math.random() * 5); // 0-5, mostly stopped
  return Math.round(Math.random() * 10); // IDLE/ASSIGNED — parked or crawling
}

function resolveBaseUrl() {
  return env.simulator.baseUrl || `http://localhost:${env.port}/api/v1`;
}

/** One simulator tick: move every active vehicle and push its new location through the real endpoint. */
async function tick() {
  const vehicles = await Vehicle.find({ status: { $nin: ['OFFLINE', 'MAINTENANCE'] } }).select(
    'vehicleId status currentLocation'
  );

  if (vehicles.length === 0) return;

  const baseUrl = resolveBaseUrl();

  const results = await Promise.allSettled(
    vehicles.map((vehicle) => {
      const fromCoords =
        vehicle.currentLocation && Array.isArray(vehicle.currentLocation.coordinates)
          ? vehicle.currentLocation.coordinates
          : null;
      const coordinates = fromCoords ? nextPosition(fromCoords) : seedPosition();

      return axios.post(
        `${baseUrl}/vehicles/${vehicle.vehicleId}/location`,
        {
          location: { type: 'Point', coordinates },
          speedKmph: randomSpeedKmph(vehicle.status),
          source: 'simulator',
        },
        {
          headers: { 'x-internal-key': env.internalServiceKey },
          timeout: 5000,
        }
      );
    })
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(
      `[simulator] ${failures.length}/${vehicles.length} location updates failed this tick:`,
      failures[0].reason?.message
    );
  }
}

/**
 * Starts the cron schedule. Safe to call once at boot (server.js, after
 * httpServer.listen — the simulator calls its own HTTP endpoint, so the
 * server must already be accepting connections). No-op if already running,
 * disabled via env, or missing the internal service key it needs to
 * authenticate.
 */
function startVehicleSimulator() {
  if (task) return task; // already running

  if (!env.simulator.enabled) {
    console.log('[simulator] disabled via SIMULATOR_ENABLED=false');
    return null;
  }
  if (!env.internalServiceKey) {
    console.warn('[simulator] INTERNAL_SERVICE_KEY not set — simulator cannot authenticate, not starting.');
    return null;
  }

  const cronExpr = `*/${Math.max(1, Math.min(59, env.simulator.intervalSeconds))} * * * * *`;
  task = cron.schedule(cronExpr, () => {
    tick().catch((err) => console.error('[simulator] tick failed:', err.message));
  });

  console.log(`[simulator] started, ticking every ${env.simulator.intervalSeconds}s`);
  return task;
}

/** Stops the schedule — used by tests / graceful shutdown, not called elsewhere yet. */
function stopVehicleSimulator() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = {
  startVehicleSimulator,
  stopVehicleSimulator,
  // Exported for unit testing without needing a running cron/HTTP stack:
  _internal: { nextPosition, seedPosition, distanceFromCenterKm, randomSpeedKmph },
};
