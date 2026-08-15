const Report = require('../../models/Report');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');
const ApiError = require('../../utils/apiError');
const { REPORT_STATUS_TRANSITIONS } = require('../../constants/reportStatus');
const { parsePagination, buildPaginationMeta } = require('../../utils/paginate');

// ---------------------------------------------------------------------------
// B3 — public flow (§5.1, §5.3, §5.4, §5.7, §5.8)
// ---------------------------------------------------------------------------

/** §5.1 POST /reports — Role: public, links to citizen account if req.user is set. */
async function createReport(body, user) {
  const report = await Report.create({
    category: body.category,
    description: body.description,
    location: body.location,
    images: body.images || [],
    reportedBy: user ? user.userId : null,
    source: 'web',
  });

  return { reportId: report.reportId, trackingToken: report.trackingToken, status: report.status };
}

/**
 * §5.3 GET /reports/track/:id?token=... — Role: public.
 * Per contract: an invalid/missing token returns 403, not 404, so a caller
 * can never distinguish "wrong token" from "report doesn't exist" — both
 * collapse into the same generic 403 below.
 */
async function trackReport(reportId, token) {
  const report = await Report.findOne({ reportId }).select('+trackingToken');

  if (!report || report.trackingToken !== token) {
    throw new ApiError(403, 'INVALID_TOKEN', 'Invalid report ID or tracking token.');
  }

  // Only the fields the contract's §5.3 example documents — deliberately not
  // the full internal record (that's §5.5, staff/admin only).
  return {
    id: report.reportId,
    status: report.status,
    category: report.category,
    statusHistory: report.statusHistory.map((h) => ({ status: h.status, timestamp: h.timestamp })),
  };
}

/** §5.4 GET /reports/my — Role: citizen (optional-account holders). */
async function myReports(userId, query) {
  const { page, limit, skip } = parsePagination(query);

  const [items, totalItems] = await Promise.all([
    Report.find({ reportedBy: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments({ reportedBy: userId }),
  ]);

  return {
    items: items.map(toCitizenOwnedReport),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

function toCitizenOwnedReport(report) {
  return {
    id: report.reportId,
    category: report.category,
    description: report.description,
    location: report.location,
    images: report.images,
    status: report.status,
    statusHistory: report.statusHistory.map((h) => ({ status: h.status, timestamp: h.timestamp })),
    feedback: report.feedback,
    createdAt: report.createdAt,
  };
}

/** §5.7 POST /reports/:id/feedback — Role: public via trackingToken, only after RESOLVED. */
async function submitFeedback(reportId, token, { rating, comment }) {
  const report = await Report.findOne({ reportId }).select('+trackingToken');

  if (!report || report.trackingToken !== token) {
    throw new ApiError(403, 'INVALID_TOKEN', 'Invalid report ID or tracking token.');
  }
  if (report.status !== 'RESOLVED') {
    throw new ApiError(409, 'REPORT_NOT_RESOLVED', 'Feedback can only be submitted after the report is RESOLVED.');
  }

  report.feedback = { rating, comment: comment || undefined, submittedAt: new Date() };
  await report.save();

  return { id: report.reportId, feedback: report.feedback };
}

/** §5.8 DELETE /reports/:id — Role: public via trackingToken, only while status is REPORTED. */
async function deleteReport(reportId, token) {
  const report = await Report.findOne({ reportId }).select('+trackingToken');

  if (!report || report.trackingToken !== token) {
    throw new ApiError(403, 'INVALID_TOKEN', 'Invalid report ID or tracking token.');
  }
  if (report.status !== 'REPORTED') {
    throw new ApiError(409, 'REPORT_NOT_DELETABLE', 'A report can only be deleted while its status is REPORTED.');
  }

  await Report.deleteOne({ _id: report._id });
}

// ---------------------------------------------------------------------------
// B4 — staff/admin (§7, §5.5, §5.6)
// ---------------------------------------------------------------------------

function toInternalReport(report) {
  return {
    id: report.reportId,
    category: report.category,
    description: report.description,
    location: report.location,
    zone: report.zone,
    images: report.images,
    status: report.status,
    statusHistory: report.statusHistory,
    source: report.source,
    reportedBy: report.reportedBy,
    assignedVehicle: report.assignedVehicle,
    assignedStaff: report.assignedStaff,
    feedback: report.feedback,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

/** §7 GET /reports — Role: staff/admin. Filters: status, category, zone, from, to, search. */
async function listReports(query) {
  const { page, limit, skip } = parsePagination(query);
  const { status, category, zone, from, to, search } = query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (zone) filter.zone = zone;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { reportId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, totalItems] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  return {
    items: items.map(toInternalReport),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

/** §7 GET /reports/assigned-to-me — Role: staff. */
async function assignedToMe(staffUserId, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { assignedStaff: staffUserId };

  const [items, totalItems] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(filter),
  ]);

  return {
    items: items.map(toInternalReport),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

/** §5.5 GET /reports/:id — Role: staff/admin, full internal detail. */
async function getReportById(reportId) {
  const report = await Report.findOne({ reportId });
  if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report does not exist.');
  return toInternalReport(report);
}

/**
 * §5.6 PATCH /reports/:id/status — Role: staff/admin.
 * Enforces the frozen transition table in constants/reportStatus.js —
 * both that FROM→TO is a legal edge at all, and that the caller's role is
 * permitted for THAT SPECIFIC edge (not just permitted for the FROM status
 * in general — see the comment on REPORT_STATUS_TRANSITIONS for why).
 */
async function updateStatus(reportId, { status: nextStatus, comment }, actor) {
  const report = await Report.findOne({ reportId });
  if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report does not exist.');

  const allowedFromCurrent = REPORT_STATUS_TRANSITIONS[report.status] || {};
  const allowedRoles = allowedFromCurrent[nextStatus];

  if (!allowedRoles) {
    throw new ApiError(
      409,
      'INVALID_TRANSITION',
      `Cannot move from ${report.status} to ${nextStatus}.`
    );
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new ApiError(403, 'FORBIDDEN', `Role '${actor.role}' cannot perform this status transition.`);
  }

  report.status = nextStatus;
  report.statusHistory.push({ status: nextStatus, timestamp: new Date(), comment, changedBy: actor.userId });
  await report.save();

  return toInternalReport(report);
}

/**
 * §7 PATCH /reports/:id/assign — Role: admin.
 *
 * Design decision (flagged in MEMORY_BACKEND.md, not explicit in the
 * contract's example): assign requires the report be PRIORITIZED, and sets
 * assignedVehicle/assignedStaff AND transitions status to ASSIGNED in the
 * same call, rather than requiring a separate PATCH .../status call after.
 * This directly follows the transition table (PRIORITIZED → ASSIGNED is
 * admin-only) — it doesn't add a new rule, just implements that edge as
 * part of assignment instead of a second manual step.
 */
async function assignReport(reportId, { vehicleId, staffId }) {
  const report = await Report.findOne({ reportId });
  if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report does not exist.');

  if (report.status !== 'PRIORITIZED') {
    throw new ApiError(
      409,
      'INVALID_TRANSITION',
      `A report can only be assigned while PRIORITIZED (current status: ${report.status}).`
    );
  }

  const [vehicle, staffUser] = await Promise.all([
    Vehicle.findOne({ vehicleId }),
    User.findOne({ userId: staffId, role: 'staff' }),
  ]);
  if (!vehicle) throw new ApiError(404, 'VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} does not exist.`);
  if (!staffUser) throw new ApiError(404, 'STAFF_NOT_FOUND', `Staff member ${staffId} does not exist.`);

  report.assignedVehicle = vehicleId;
  report.assignedStaff = staffId;
  report.status = 'ASSIGNED';
  report.statusHistory.push({ status: 'ASSIGNED', timestamp: new Date(), changedBy: null });
  await report.save();

  return toInternalReport(report);
}

/**
 * §7 GET /reports/heatmap — Role: admin.
 * Groups reports into a coarse grid (~100m, 3-decimal-degree rounding) by
 * category, returning cluster centroid + count. This grid size and the
 * decision to include reports of every status (not just active ones) are
 * an implementation choice, not specified by the contract's example —
 * flagged in MEMORY_BACKEND.md.
 */
async function heatmap() {
  const GRID_PRECISION = 3; // ~111m at the equator

  const clusters = await Report.aggregate([
    {
      $project: {
        category: 1,
        lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, GRID_PRECISION] },
        lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, GRID_PRECISION] },
      },
    },
    {
      $group: {
        _id: { lng: '$lng', lat: '$lat', category: '$category' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return clusters.map((c) => ({
    location: { type: 'Point', coordinates: [c._id.lng, c._id.lat] },
    count: c.count,
    category: c._id.category,
  }));
}

module.exports = {
  createReport,
  trackReport,
  myReports,
  submitFeedback,
  deleteReport,
  listReports,
  assignedToMe,
  getReportById,
  updateStatus,
  assignReport,
  heatmap,
};
