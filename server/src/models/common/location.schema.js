const mongoose = require('mongoose');

/**
 * Frozen GeoJSON location shape — API_CONTRACT.md §3:
 *   { "type": "Point", "coordinates": [lng, lat], "address": "..." }
 * Used verbatim by Report.location and Vehicle.currentLocation. Defined once
 * here so both models (and anything later that needs a location) share the
 * exact same shape — per RULES.md §3, this shape never deviates per layer.
 *
 * `address` is optional: required on citizen-submitted reports in practice
 * (controller-level concern, B3), but vehicle location pings from the
 * simulator/GPS have no meaningful street address, so it isn't required here.
 */
const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      // [longitude, latitude] — GeoJSON order, NOT [lat, lng].
      type: [Number],
      required: true,
      validate: {
        validator: (val) => Array.isArray(val) && val.length === 2,
        message: 'coordinates must be an array of exactly [longitude, latitude].',
      },
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

module.exports = locationSchema;
