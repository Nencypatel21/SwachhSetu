const mongoose = require('mongoose');
const crypto = require('crypto');

const { REPORT_STATUSES } = require('../constants/reportStatus');
const locationSchema = require('./common/location.schema');
const { generateReportId } = require('../utils/idGenerator');

/**
 * Report model — API_CONTRACT.md §5. The single model every input channel
 * (Web/PWA and WhatsApp, ARCHITECTURE.md §3 principle 3) creates, tagged by
 * `source`, flowing through one status lifecycle worked by the same
 * staff/admin screens.
 *
 * `reportId` / `trackingToken` are the two values the contract's create
 * response (§5.1) returns — `reportId` is the human-readable identifier used
 * everywhere else in the API (this project's convention — see
 * MEMORY_BACKEND.md); `trackingToken` is the secret required alongside it for
 * anonymous access (§5.3, §5.7, §5.8). Neither is ever exposed to a request
 * that hasn't proven it holds the token, except to staff/admin (§5.5, full
 * internal detail).
 *
 * `category` and `zone` are plain strings, not foreign keys — Category/Zone
 * are admin-managed config lists (ARCHITECTURE.md §5), not a relational
 * constraint the Report schema itself enforces in Phase 1.
 */
const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    trackingToken: {
      type: String,
      select: false,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: locationSchema,
      required: true,
    },
    // Optional admin/zone-lookup field — not present on the §5.1 create
    // request, populated later (B4/B7 territory) for filtering/heatmap use.
    zone: {
      type: String,
      trim: true,
      default: null,
    },

    images: {
      type: [
        {
          imageUrl: { type: String, required: true },
          publicId: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'REPORTED',
      index: true,
    },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: REPORT_STATUSES, required: true },
          timestamp: { type: Date, default: Date.now },
          comment: { type: String, trim: true },
          // userId (human-readable) of whoever made the change; null for the
          // system-generated initial REPORTED entry.
          changedBy: { type: String, default: null },
          _id: false,
        },
      ],
      default: [],
    },

    source: {
      type: String,
      enum: ['web', 'whatsapp'],
      default: 'web',
    },

    // Set only if a valid Authorization header was present at creation (§5.1);
    // stores the citizen's human-readable userId, not a Mongo ref — consistent
    // with this project's cross-reference convention (see MEMORY_BACKEND.md).
    reportedBy: {
      type: String,
      default: null,
      index: true,
    },
    assignedVehicle: {
      type: String, // Vehicle.vehicleId
      default: null,
    },
    assignedStaff: {
      type: String, // User.userId
      default: null,
    },

    feedback: {
      type: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, trim: true },
        submittedAt: { type: Date, default: Date.now },
        _id: false,
      },
      default: null,
    },

    // Reserved extension object (contract §3) — Phase 2 fields slot in here
    // without breaking existing consumers of this schema.
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Supports §7 heatmap / §10 hotspot aggregation queries.
reportSchema.index({ location: '2dsphere' });

reportSchema.pre('save', function preSave(next) {
  if (this.isNew) {
    if (!this.trackingToken) {
      this.trackingToken = `trk_${crypto.randomBytes(8).toString('hex')}`;
    }
    if (this.statusHistory.length === 0) {
      this.statusHistory.push({ status: this.status || 'REPORTED', timestamp: new Date(), changedBy: null });
    }
  }
  next();
});

// reportId is generated async (DB-backed counter), so it's assigned in a
// separate pre-validate hook rather than the sync pre-save above — pre-validate
// runs before the schema's `required: true` check on reportId, so this must
// stay a pre-validate hook (not pre-save) or every new report would fail
// validation before ever reaching this line.
reportSchema.pre('validate', async function preValidate(next) {
  try {
    if (this.isNew && !this.reportId) {
      this.reportId = await generateReportId();
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Report', reportSchema);
