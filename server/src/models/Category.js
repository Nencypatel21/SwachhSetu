const mongoose = require('mongoose');

/**
 * Category model — API_CONTRACT.md §15. Admin-managed config (public read,
 * admin write), not a hardcoded enum — ARCHITECTURE.md §5 is explicit that
 * categories/zones must stay configurable, not baked into code.
 * Report.category stores the plain string name, not a ref to this collection
 * (see Report.js) — Phase 1 does not enforce that relation at the DB layer.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
