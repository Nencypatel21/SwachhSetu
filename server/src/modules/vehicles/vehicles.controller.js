const vehiclesService = require('./vehicles.service');
const { validateCreateVehicle, validateLocationUpdate, validateStatusFilter } = require('./vehicles.validation');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  validateCreateVehicle(req.body);
  const result = await vehiclesService.createVehicle(req.body);
  return apiResponse(res, 201, result);
});

const list = asyncHandler(async (req, res) => {
  validateStatusFilter(req.query.status);
  const result = await vehiclesService.listVehicles(req.query);
  return apiResponse(res, 200, result.items, undefined, result.pagination);
});

const updateLocation = asyncHandler(async (req, res) => {
  validateLocationUpdate(req.body);
  const result = await vehiclesService.updateLocation(req.params.id, req.body, Boolean(req.isInternalService));
  return apiResponse(res, 200, result);
});

const live = asyncHandler(async (req, res) => {
  const result = await vehiclesService.liveVehicles();
  return apiResponse(res, 200, result);
});

module.exports = { create, list, updateLocation, live };
