const mongoose = require('mongoose');

const { generateRouteId } = require('../utils/idGenerator');

/**
 * Route model — API_CONTRACT.md §9. `stops[].reportId` and `vehicleId` store
 * the human-readable IDs (e.g. "RPT-2026-0142", "VEH-014"), not Mongo refs —
 * see MEMORY_BACKEND.md "Design decisions" for why.
 *
 * `optimizedBy` is `"osrm-or-tools"` on the primary path or
 * `"phase1-nearest-neighbour"` on the fallback (§9) — both are first-class,
 * not a throwaway hack (RULES.md §9).
 */
const routeSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleId: {
      type: String, // Vehicle.vehicleId
      required: true,
    },
    schedule: {
      type: String, // e.g. "08:00" — kept as the plain string the contract's example shows
      default: null,
    },
    stops: {
      type: [
        {
          reportId: { type: String, required: true }, // Report.reportId
          sequence: { type: Number, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    baselineDistanceKm: {
      type: Number,
      default: null,
    },
    optimizedDistanceKm: {
      type: Number,
      default: null,
    },
    estimatedTimeMin: {
      type: Number,
      default: null,
    },
    optimizedBy: {
      type: String,
      enum: ['osrm-or-tools', 'phase1-nearest-neighbour'],
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

routeSchema.pre('validate', async function preValidate(next) {
  try {
    if (this.isNew && !this.routeId) {
      this.routeId = await generateRouteId();
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Route', routeSchema);
