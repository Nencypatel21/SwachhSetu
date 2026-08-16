const mongoose = require('mongoose');

const { RISK_LEVELS, PREDICTED_BY } = require('../constants/hotspotRisk');
const locationSchema = require('./common/location.schema');

/**
 * Hotspot model — API_CONTRACT.md §10. NOT part of the original B1 model
 * list (B1 predates the hotspot module) — added here in B7 because
 * `GET /hotspots` needs to serve a precomputed snapshot quickly rather than
 * re-aggregating the full Report collection on every read, and
 * `POST /hotspots/recalculate` needs somewhere to write its output. Flagged
 * as an addition in MEMORY_BACKEND.md, same spirit as B4 adding
 * utils/paginate.js or B5 adding internalService.middleware.js.
 *
 * One document per (grid cell, category) cluster, replaced wholesale on
 * every recalculation (see hotspots.service.js) rather than diffed/upserted
 * — simplest correct approach for the size of data an MVP city deployment
 * produces.
 */
const hotspotSchema = new mongoose.Schema(
  {
    location: {
      type: locationSchema,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    riskLevel: {
      type: String,
      enum: RISK_LEVELS,
      required: true,
    },
    predictedBy: {
      type: String,
      enum: Object.values(PREDICTED_BY),
      required: true,
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
    // Reserved extension object (contract §3), also used here to stash
    // non-frozen bookkeeping (e.g. reportCount behind the score) without
    // touching the frozen top-level response shape — see hotspots.service.js.
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

hotspotSchema.index({ location: '2dsphere' });
hotspotSchema.index({ riskScore: -1 });

module.exports = mongoose.model('Hotspot', hotspotSchema);
