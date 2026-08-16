const cron = require('node-cron');

const env = require('../config/env');
const hotspotsService = require('../modules/hotspots/hotspots.service');

/**
 * B7 — periodic hotspot recalculation. ARCHITECTURE.md §2's system diagram
 * lists "hotspot recalc" as one of the cron jobs alongside the vehicle
 * simulator tick; this file is that job. New file, not in PHASES.md B7's
 * literal file list (which only names `modules/hotspots/*`) — flagged as an
 * addition in MEMORY_BACKEND.md, same precedent as B4 adding
 * utils/paginate.js.
 *
 * Unlike jobs/vehicleSimulator.js (B6), this does NOT make an HTTP call to
 * its own server — it calls hotspotsService.recalculateHotspots() directly,
 * in-process. There's no API boundary to cross and therefore no need for
 * the internal-service-key pattern B6 needed; this is exactly the "or cron
 * job" allowance in the contract's `POST /hotspots/recalculate — Role:
 * admin (or cron job)` line.
 */

let task = null;

async function runOnce() {
  try {
    const result = await hotspotsService.recalculateHotspots();
    console.log(`[hotspot-recalc] recalculated ${result.recalculatedCount} hotspot(s) via ${result.predictedBy}`);
  } catch (err) {
    console.error('[hotspot-recalc] failed:', err.message);
  }
}

/** Starts the cron schedule. Safe to call once at boot; no-op if already running or disabled via env. */
function startHotspotRecalcJob() {
  if (task) return task;

  if (!env.hotspot.enabled) {
    console.log('[hotspot-recalc] disabled via HOTSPOT_RECALC_ENABLED=false');
    return null;
  }

  task = cron.schedule(env.hotspot.recalcCron, () => {
    runOnce();
  });

  console.log(`[hotspot-recalc] started, schedule "${env.hotspot.recalcCron}"`);
  return task;
}

/** Stops the schedule — used by tests / graceful shutdown, not called elsewhere yet. */
function stopHotspotRecalcJob() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startHotspotRecalcJob, stopHotspotRecalcJob, runOnce };
