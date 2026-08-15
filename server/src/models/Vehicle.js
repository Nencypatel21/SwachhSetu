const mongoose = require('mongoose');

const { VEHICLE_STATUSES } = require('../constants/vehicleStatus');
const locationSchema = require('./common/location.schema');
const { generateVehicleId } = require('../utils/idGenerator');

/**
 * Vehicle model — API_CONTRACT.md §8. `currentLocation` is pushed by the
 * simulator job in MVP (B6) and by real driver-device GPS in Phase 2 — same
 * field, same shape, per ARCHITECTURE.md §1 principle 5 ("real thing
 * deferred, contract kept stable").
 */
const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    capacityKg: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: VEHICLE_STATUSES,
      default: 'IDLE',
      index: true,
    },
    currentLocation: {
      type: locationSchema,
      default: null,
    },
    speedKmph: {
      type: Number,
      default: null,
    },
    // "simulator" in MVP (B6), real device source string in Phase 2 —
    // same contract, per §8. Not the same field as Report.source.
    locationSource: {
      type: String,
      default: null,
    },
    lastLocationUpdate: {
      type: Date,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ currentLocation: '2dsphere' });

vehicleSchema.pre('validate', async function preValidate(next) {
  try {
    if (this.isNew && !this.vehicleId) {
      this.vehicleId = await generateVehicleId();
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
