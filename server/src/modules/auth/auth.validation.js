const ApiError = require('../../utils/apiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(body) {
  const { name, email, phone, password } = body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) errors.push('name is required.');
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) errors.push('a valid email is required.');
  if (!phone || typeof phone !== 'string' || !phone.trim()) errors.push('phone is required.');
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password is required and must be at least 8 characters.');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
  }
}

function validateLogin(body) {
  const { email, password } = body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) errors.push('a valid email is required.');
  if (!password || typeof password !== 'string') errors.push('password is required.');

  if (errors.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', errors.join(' '));
  }
}

function validateRefreshToken(body) {
  const { refreshToken } = body || {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'refreshToken is required.');
  }
}

module.exports = { validateRegister, validateLogin, validateRefreshToken };
