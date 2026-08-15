const mongoose = require('mongoose');

/**
 * Zone model — API_CONTRACT.md §15 (public read) / §12 (`GET /public/areas`
 * reports per-zone aggregates by this same `name`). Config, not a hardcoded
 * enum — same rationale as Category.js.
 *
 * `boundary` is left as a loose GeoJSON-shaped field rather than a strict
 * schema: the contract never specifies a zone boundary format, only that
 * zones are named and used for filtering/aggregation (§7, §12). Kept minimal
 * on purpose — tighten only if a later phase's task actually needs it.
 */
const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    boundary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Zone', zoneSchema);
