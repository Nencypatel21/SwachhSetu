const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../../models/User');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.userId, mongoId: user._id.toString(), role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.userId, mongoId: user._id.toString(), role: user.role },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

function toPublicUser(user) {
  return {
    id: user.userId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

/**
 * §4 POST /auth/register — Role: public, optional citizen account.
 * Staff/admin accounts are admin-created only (ARCHITECTURE.md §5,
 * RULES.md) — role is ALWAYS forced to 'citizen' here regardless of
 * anything the client sends; there is no client-controlled role on this
 * endpoint, by design, not by oversight.
 */
async function register({ name, email, phone, password }) {
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
  }

  const user = await User.create({ name, email, phone, password, role: 'citizen' });
  return toPublicUser(user);
}

/** §4 POST /auth/login — Role: public (any account type). */
async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { accessToken, refreshToken, user: { id: user.userId, role: user.role } };
}

/**
 * §4 POST /auth/refresh-token. Verifies the refresh JWT, then confirms it
 * matches the hash stored on the user (so a logged-out or rotated-away
 * refresh token is rejected even if it hasn't expired yet). Rotates the
 * refresh token on every use.
 */
async function refreshToken(oldRefreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, env.jwt.refreshSecret);
  } catch (err) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.mongoId).select('+refreshTokenHash');
  if (!user || !user.isActive || !user.refreshTokenHash) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
  }

  const isMatch = await bcrypt.compare(oldRefreshToken, user.refreshTokenHash);
  if (!isMatch) {
    throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.');
  }

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
}

/** §4 POST /auth/logout — invalidates the stored refresh token hash. */
async function logout(mongoId) {
  await User.findByIdAndUpdate(mongoId, { refreshTokenHash: null });
}

/** §4 GET /auth/me */
async function me(mongoId) {
  const user = await User.findById(mongoId);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Account not found or inactive.');
  }
  return toPublicUser(user);
}

module.exports = { register, login, refreshToken, logout, me };
