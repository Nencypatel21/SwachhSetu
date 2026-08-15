const ApiError = require('../../utils/apiError');
const { REPORT_STATUSES } = require('../../constants/reportStatus');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** §5.1 POST /reports */
function validateCreateReport(body) {
  const { category, description, location, images } = body || {};
  const errors = [];

  if (!isNonEmptyString(category)) errors.push('category is required.');
  if (!isNonEmptyString(description)) errors.push('description is required.');

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
    // location.schema.js leaves `address` optional at the DB layer but notes
    // it's "required in practice" for citizen reports — enforced here, the
    // controller-level concern the model's comment calls out.
    if (!isNonEmptyString(location.address)) errors.push('location.address is required.');
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      errors.push('images must be an array.');
    } else if (
      !images.every(
        (img) => img && isNonEmptyString(img.imageUrl) && isNonEmptyString(img.publicId)
      )
    ) {
      errors.push('each image must have imageUrl and publicId (from POST /uploads/report-image).');
    }
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §5.6 PATCH /reports/:id/status */
function validateStatusUpdate(body) {
  const { status, comment } = body || {};
  const errors = [];

  if (!isNonEmptyString(status) || !REPORT_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${REPORT_STATUSES.join(', ')}.`);
  }
  if (comment !== undefined && typeof comment !== 'string') {
    errors.push('comment must be a string if provided.');
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §7 PATCH /reports/:id/assign */
function validateAssign(body) {
  const { vehicleId, staffId } = body || {};
  const errors = [];

  if (!isNonEmptyString(vehicleId)) errors.push('vehicleId is required.');
  if (!isNonEmptyString(staffId)) errors.push('staffId is required.');

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §5.7 POST /reports/:id/feedback */
function validateFeedback(body) {
  const { rating, comment } = body || {};
  const errors = [];

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    errors.push('rating is required and must be a number from 1 to 5.');
  }
  if (comment !== undefined && typeof comment !== 'string') {
    errors.push('comment must be a string if provided.');
  }

  if (errors.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
}

/** §5.3 track token, §5.7/§5.8 token-gated actions — shared token presence check */
function validateTrackingToken(token) {
  if (!isNonEmptyString(token)) {
    throw new ApiError(403, 'INVALID_TOKEN', 'A valid tracking token is required.');
  }
}

module.exports = {
  validateCreateReport,
  validateStatusUpdate,
  validateAssign,
  validateFeedback,
  validateTrackingToken,
};
