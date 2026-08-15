const ApiError = require('../../utils/apiError');
const { VEHICLE_STATUSES } = require('../../constants/vehicleStatus');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** §8 POST /vehicles */
function validateCreateVehicle(body) {
  const { plateNumber, type, capacityKg } = body || {};
  const errors = [];

  if (!isNonEmptyString(plateNumber)) errors.push('plateNumber is required.');
  if (!isNonEmptyString(type)) errors.push('type is required.');
  if (typeof capacityKg !== 'number' || capacityKg <= 0) {
    errors.push('capacityKg is required and must be a positive number.');
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §8 POST /vehicles/:id/location */
function validateLocationUpdate(body) {
  const { location, speedKmph, source } = body || {};
  const errors = [];

  if (!location || typeof location !== 'object') {
    errors.push('location is required.');
  } else {
    if (location.type !== 'Point') errors.push('location.type must be "Point".');
    if (
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2 ||
      !location.coordinates.every((n) => typeof n === 'number')
    ) {
      errors.push('location.coordinates must be [longitude, latitude].');
    }
  }
  if (speedKmph !== undefined && (typeof speedKmph !== 'number' || speedKmph < 0)) {
    errors.push('speedKmph must be a non-negative number if provided.');
  }
  if (source !== undefined && typeof source !== 'string') {
    errors.push('source must be a string if provided.');
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** Optional ?status= filter on GET /vehicles */
function validateStatusFilter(status) {
  if (status !== undefined && !VEHICLE_STATUSES.includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `status must be one of: ${VEHICLE_STATUSES.join(', ')}.`);
  }
}

module.exports = { validateCreateVehicle, validateLocationUpdate, validateStatusFilter };
