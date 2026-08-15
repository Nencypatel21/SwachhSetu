const jwt = require('jsonwebtoken');

const env = require('../config/env');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

function verifyAccessToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    return undefined; // present but invalid/expired — distinct from "absent"
  }
}

/**
 * Requires a valid Bearer access token (contract §3: staff/admin/authenticated-
 * citizen routes only — public routes never use this). On success attaches
 * req.user = { userId, mongoId, role } decoded from the token payload.
 */
const protect = asyncHandler(async (req, res, next) => {
  const decoded = verifyAccessToken(req);

  if (decoded === null) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header.');
  }
  if (decoded === undefined) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired access token.');
  }

  req.user = { userId: decoded.userId, mongoId: decoded.mongoId, role: decoded.role };
  next();
});

/**
 * Optional-auth variant for `public` routes where an Authorization header MAY
 * be present and, if valid, should link the request to that account — e.g.
 * §5.1 POST /reports (public, but links to the citizen account if logged in).
 * Never throws: missing or invalid tokens are silently treated as anonymous.
 */
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const decoded = verifyAccessToken(req);
  if (decoded && decoded !== undefined) {
    req.user = { userId: decoded.userId, mongoId: decoded.mongoId, role: decoded.role };
  }
  next();
});

module.exports = { protect, attachUserIfPresent };
