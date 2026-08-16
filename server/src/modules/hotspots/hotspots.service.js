const Report = require('../../models/Report');
const Hotspot = require('../../models/Hotspot');
const { PREDICTED_BY, riskLevelFromScore } = require('../../constants/hotspotRisk');

/**
 * §10 Hotspot Prediction (AI). PHASES.md B7: "start with
 * predictedBy: 'phase1-heuristic'; ... XGBoost is a later swap-in behind the
 * same response shape, not a new phase." So this file implements ONLY the
 * heuristic path for now — computeHeuristicHotspots() below is the one
 * swap-in point a future XGBoost integration replaces; everything else
 * (persistence, response shape, riskLevel thresholds) stays exactly as-is
 * per RULES.md §9 (fallbacks are first-class, not throwaway).
 *
 * Grid clustering mirrors reports.service.js's heatmap() (~3-decimal-degree
 * / ~100m grid cells, same GRID_PRECISION value) but is computed
 * independently here rather than by calling that function, because this
 * needs per-report `createdAt` for the recency feature below, which
 * heatmap()'s response shape doesn't carry. No shared file was modified to
 * get this (RULES.md §2) — this is new, parallel aggregation logic.
 */

const GRID_PRECISION = 3; // ~111m at the equator — matches reports.service.js's heatmap grid size

// --- Heuristic scoring knobs (MVP defaults, not contract-specified — flagged
// in MEMORY_BACKEND.md, same as B4/B5's flagged implementation choices) ---
const LOOKBACK_DAYS = 90; // reports older than this don't feed the heuristic at all
const RECENCY_HALF_LIFE_DAYS = 14; // a report's contribution roughly halves every 14 days
const SATURATION_COUNT = 15; // grid cell density/recency "maxes out" the score around this many weighted reports
const DENSITY_WEIGHT = 0.6;
const RECENCY_WEIGHT = 0.4;

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Minimum input features per contract §10: "historical report density by
 * zone and category (from §7 heatmap)" and "day-of-week/time-of-day
 * pattern". This heuristic implements density (report count per grid cell)
 * and a recency-decay proxy for temporal pattern (a cell that's still
 * getting reports recently scores higher than one that was hot 3 months
 * ago but has gone quiet). It does NOT implement zone population/bin-density
 * weighting or a full day-of-week/hour histogram — that data isn't
 * available in this MVP dataset; flagged as an open item for the real
 * XGBoost feature set in MEMORY_BACKEND.md, not silently skipped.
 */
async function computeHeuristicHotspots() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const reports = await Report.find(
    { createdAt: { $gte: since }, 'location.coordinates': { $exists: true } },
    { location: 1, category: 1, createdAt: 1 }
  ).lean();

  const now = Date.now();
  const clusters = new Map(); // key -> { lng, lat, category, count, recencySum }

  for (const report of reports) {
    const coords = report.location && report.location.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) continue;

    const gridLng = round(coords[0], GRID_PRECISION);
    const gridLat = round(coords[1], GRID_PRECISION);
    const key = `${gridLng}:${gridLat}:${report.category}`;

    const daysAgo = (now - new Date(report.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-daysAgo / RECENCY_HALF_LIFE_DAYS);

    if (!clusters.has(key)) {
      clusters.set(key, { lng: gridLng, lat: gridLat, category: report.category, count: 0, recencySum: 0 });
    }
    const cluster = clusters.get(key);
    cluster.count += 1;
    cluster.recencySum += recencyWeight;
  }

  return Array.from(clusters.values()).map((cluster) => {
    const densityScore = Math.min(cluster.count / SATURATION_COUNT, 1);
    const recencyScore = Math.min(cluster.recencySum / SATURATION_COUNT, 1);
    const riskScore = round(clamp01(DENSITY_WEIGHT * densityScore + RECENCY_WEIGHT * recencyScore), 2);

    return {
      location: { type: 'Point', coordinates: [cluster.lng, cluster.lat] },
      category: cluster.category,
      riskScore,
      riskLevel: riskLevelFromScore(riskScore),
      predictedBy: PREDICTED_BY.HEURISTIC,
      meta: { reportCount: cluster.count },
    };
  });
}

/**
 * §10 POST /hotspots/recalculate — Role: admin (or cron job). Called
 * directly (in-process) by BOTH the admin-facing controller AND
 * jobs/hotspotRecalcJob.js — that's how this endpoint satisfies "or cron
 * job" from the contract without needing its own internal-service auth path
 * like B6 needed (the cron job here runs in the same process, so it's not
 * crossing the HTTP boundary at all).
 *
 * Replace-wholesale strategy: delete the previous snapshot and insert the
 * freshly computed one. Simpler and safer than diff/upsert at MVP data
 * volumes — an admin reading GET /hotspots mid-recalculation would very
 * briefly see an empty or partial list; acceptable tradeoff for a 5-day MVP,
 * flagged for revisit if it matters later.
 */
async function recalculateHotspots() {
  const computed = await computeHeuristicHotspots();
  const computedAt = new Date();

  await Hotspot.deleteMany({});
  if (computed.length > 0) {
    await Hotspot.insertMany(computed.map((h) => ({ ...h, computedAt })));
  }

  return { recalculatedCount: computed.length, predictedBy: PREDICTED_BY.HEURISTIC, computedAt };
}

/** §10 GET /hotspots — Role: admin. Optional ?category= filter, sorted by riskScore desc. */
async function listHotspots(query = {}) {
  const filter = {};
  if (query.category) filter.category = query.category;

  const hotspots = await Hotspot.find(filter).sort({ riskScore: -1 });

  return hotspots.map((h) => ({
    location: h.location,
    riskScore: h.riskScore,
    riskLevel: h.riskLevel,
    predictedBy: h.predictedBy,
    category: h.category,
  }));
}

module.exports = { computeHeuristicHotspots, recalculateHotspots, listHotspots };
