const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/apiError');

/**
 * Rate limiting for unauthenticated write endpoints — API_CONTRACT.md §6
 * calls this out explicitly for uploads ("rate-limited to prevent abuse,
 * since it's unauthenticated"). Applied the same way to POST /reports,
 * feedback, and delete-while-REPORTED (§5.1, §5.7, §5.8) — all `public`
 * writes with no account behind them to otherwise throttle abuse.
 *
 * Values are a reasonable MVP default, not specified by the contract —
 * flagged in MEMORY_BACKEND.md, adjust if real usage needs differ.
 */
function makeLimiter({ windowMs, max, code }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new ApiError(429, code, 'Too many requests. Please try again later.'));
    },
  });
}

// Report creation / image upload: the two heaviest, most abuse-prone public writes.
const publicWriteLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  code: 'RATE_LIMITED',
});

// Feedback / delete: lighter-weight, still public, still worth a ceiling.
const publicActionLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  code: 'RATE_LIMITED',
});

module.exports = { publicWriteLimiter, publicActionLimiter };
