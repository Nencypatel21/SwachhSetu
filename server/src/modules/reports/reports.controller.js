const reportsService = require('./reports.service');
const {
  validateCreateReport,
  validateStatusUpdate,
  validateAssign,
  validateFeedback,
  validateTrackingToken,
} = require('./reports.validation');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

// --- B3 public flow ---

const create = asyncHandler(async (req, res) => {
  validateCreateReport(req.body);
  const result = await reportsService.createReport(req.body, req.user || null);
  return apiResponse(res, 201, result);
});

const track = asyncHandler(async (req, res) => {
  validateTrackingToken(req.query.token);
  const result = await reportsService.trackReport(req.params.id, req.query.token);
  return apiResponse(res, 200, result);
});

const my = asyncHandler(async (req, res) => {
  const result = await reportsService.myReports(req.user.userId, req.query);
  return apiResponse(res, 200, result.items, undefined, result.pagination);
});

const feedback = asyncHandler(async (req, res) => {
  validateTrackingToken(req.query.token);
  validateFeedback(req.body);
  const result = await reportsService.submitFeedback(req.params.id, req.query.token, req.body);
  return apiResponse(res, 200, result, 'Feedback submitted.');
});

const remove = asyncHandler(async (req, res) => {
  validateTrackingToken(req.query.token);
  await reportsService.deleteReport(req.params.id, req.query.token);
  return res.status(204).send();
});

// --- B4 staff/admin ---

const list = asyncHandler(async (req, res) => {
  const result = await reportsService.listReports(req.query);
  return apiResponse(res, 200, result.items, undefined, result.pagination);
});

const assignedToMe = asyncHandler(async (req, res) => {
  const result = await reportsService.assignedToMe(req.user.userId, req.query);
  return apiResponse(res, 200, result.items, undefined, result.pagination);
});

const getById = asyncHandler(async (req, res) => {
  const result = await reportsService.getReportById(req.params.id);
  return apiResponse(res, 200, result);
});

const updateStatus = asyncHandler(async (req, res) => {
  validateStatusUpdate(req.body);
  const result = await reportsService.updateStatus(req.params.id, req.body, req.user);
  return apiResponse(res, 200, result, 'Status updated.');
});

const assign = asyncHandler(async (req, res) => {
  validateAssign(req.body);
  const result = await reportsService.assignReport(req.params.id, req.body);
  return apiResponse(res, 200, result, 'Report assigned.');
});

const heatmap = asyncHandler(async (req, res) => {
  const result = await reportsService.heatmap();
  return apiResponse(res, 200, result);
});

module.exports = { create, track, my, feedback, remove, list, assignedToMe, getById, updateStatus, assign, heatmap };
