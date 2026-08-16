const routesService = require('./routes.service');
const { validateCreateRoute, validateUpdateRoute, validateOptimizeRequest } = require('./routes.validation');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  validateCreateRoute(req.body);
  const result = await routesService.createRoute(req.body);
  return apiResponse(res, 201, result);
});

const list = asyncHandler(async (req, res) => {
  const result = await routesService.listRoutes(req.query);
  return apiResponse(res, 200, result.items, undefined, result.pagination);
});

const getById = asyncHandler(async (req, res) => {
  const result = await routesService.getRouteById(req.params.id);
  return apiResponse(res, 200, result);
});

const update = asyncHandler(async (req, res) => {
  validateUpdateRoute(req.body);
  const result = await routesService.updateRoute(req.params.id, req.body);
  return apiResponse(res, 200, result);
});

const optimize = asyncHandler(async (req, res) => {
  validateOptimizeRequest(req.body);
  const result = await routesService.optimizeRoute(req.body);
  return apiResponse(res, 201, result);
});

module.exports = { create, list, getById, update, optimize };
