const mongoose = require('mongoose');

/**
 * Notification model — API_CONTRACT.md §14. Only reaches authenticated users
 * (staff/admin/optional-citizen) per ARCHITECTURE.md §5 — anonymous Web/PWA
 * reporters self-poll `track/:id` instead, and WhatsApp reporters get a reply
 * on their chat thread (not a row in this collection).
 *
 * `type` is intentionally a free string, not a frozen enum: the contract
 * does not define a fixed set of notification types (§14 only gives examples
 * — status transitions, vehicle assigned, resolution feedback request).
 * Flagged in MEMORY_BACKEND.md as open for whoever builds B11 to tighten if
 * needed — not a deviation, just contract silence.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // User.userId — recipient
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedReportId: {
      type: String, // Report.reportId, optional
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
