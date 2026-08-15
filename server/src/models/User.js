const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { USER_ROLES } = require('../constants/roles');
const { generateUserId } = require('../utils/idGenerator');

/**
 * User model — API_CONTRACT.md §4 (auth), §13 (dashboards).
 *
 * `role` is one of USER_ROLES only (citizen/staff/admin) — 'public' is never
 * stored here, it means "no User document / no auth header" (see
 * constants/roles.js). Citizen accounts are optional and self-registered
 * (§4 POST /auth/register); staff/admin accounts are admin-created only
 * (ARCHITECTURE.md §5, RULES.md) — B2's register endpoint must enforce this
 * by always forcing role: 'citizen' server-side, never trusting a client-sent
 * role field.
 *
 * `userId` is the human-readable identifier (e.g. "USR-1001") used in all API
 * responses and cross-references — see MEMORY_BACKEND.md "Design decisions"
 * for why this project uses these IDs (not Mongo _id) as the canonical
 * cross-model reference.
 */
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format.'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never returned by default queries
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: 'citizen',
    },
    // Hash of the currently-valid refresh token, so /auth/logout and token
    // rotation on /auth/refresh-token can actually invalidate a session
    // server-side instead of relying purely on client-side token deletion.
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  try {
    if (this.isNew && !this.userId) {
      this.userId = await generateUserId();
    }
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});

/** Compares a plaintext candidate password against the stored hash. */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
