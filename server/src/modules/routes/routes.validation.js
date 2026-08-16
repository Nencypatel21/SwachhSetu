const ApiError = require('../../utils/apiError');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidLocation(loc) {
  return (
    loc &&
    typeof loc === 'object' &&
    loc.type === 'Point' &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length === 2 &&
    loc.coordinates.every((n) => typeof n === 'number')
  );
}

function isValidStopList(stops, { requireSequence }) {
  if (!Array.isArray(stops) || stops.length === 0) return 'stops must be a non-empty array.';
  for (const stop of stops) {
    if (!stop || !isNonEmptyString(stop.reportId)) return 'Each stop requires a reportId.';
    if (requireSequence && typeof stop.sequence !== 'number') {
      return 'Each stop requires a numeric sequence.';
    }
  }
  return null;
}

/** §9 POST /routes — manual route creation, sequence given by the caller. */
function validateCreateRoute(body) {
  const { name, vehicleId, schedule, stops } = body || {};
  const errors = [];

  if (!isNonEmptyString(name)) errors.push('name is required.');
  if (!isNonEmptyString(vehicleId)) errors.push('vehicleId is required.');
  if (schedule !== undefined && schedule !== null && typeof schedule !== 'string') {
    errors.push('schedule must be a string if provided.');
  }
  const stopsError = isValidStopList(stops, { requireSequence: true });
  if (stopsError) errors.push(stopsError);

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §9 PATCH /routes/:id — every field optional, but whatever is given must be well-formed. */
function validateUpdateRoute(body) {
  const { name, vehicleId, schedule, stops } = body || {};
  const errors = [];

  if (name !== undefined && !isNonEmptyString(name)) errors.push('name must be a non-empty string.');
  if (vehicleId !== undefined && !isNonEmptyString(vehicleId)) errors.push('vehicleId must be a non-empty string.');
  if (schedule !== undefined && schedule !== null && typeof schedule !== 'string') {
    errors.push('schedule must be a string if provided.');
  }
  if (stops !== undefined) {
    const stopsError = isValidStopList(stops, { requireSequence: true });
    if (stopsError) errors.push(stopsError);
  }
  if (Object.keys(body || {}).length === 0) errors.push('At least one field must be provided.');

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §9 POST /routes/optimize */
function validateOptimizeRequest(body) {
  const { depot, vehicleId, capacityKg, stops } = body || {};
  const errors = [];

  if (!isValidLocation(depot)) errors.push('depot must be a GeoJSON Point { type, coordinates }.');
  if (!isNonEmptyString(vehicleId)) errors.push('vehicleId is required.');
  if (capacityKg !== undefined && capacityKg !== null && (typeof capacityKg !== 'number' || capacityKg <= 0)) {
    errors.push('capacityKg must be a positive number if provided.');
  }
  if (!Array.isArray(stops) || stops.length === 0) {
    errors.push('stops must be a non-empty array.');
  } else {
    for (const stop of stops) {
      if (!stop || !isNonEmptyString(stop.reportId)) errors.push('Each stop requires a reportId.');
      if (!stop || !isValidLocation(stop.location)) errors.push(`Stop ${stop && stop.reportId} requires a valid location.`);
      if (stop && stop.estimatedLoadKg !== undefined && typeof stop.estimatedLoadKg !== 'number') {
        errors.push(`Stop ${stop.reportId}'s estimatedLoadKg must be a number if provided.`);
      }
    }
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

module.exports = { validateCreateRoute, validateUpdateRoute, validateOptimizeRequest };
