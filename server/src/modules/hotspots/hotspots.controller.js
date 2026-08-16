const hotspotsService = require('./hotspots.service');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await hotspotsService.listHotspots(req.query);
  return apiResponse(res, 200, result);
});

const recalculate = asyncHandler(async (req, res) => {
  const result = await hotspotsService.recalculateHotspots();
  return apiResponse(res, 200, result, 'Hotspots recalculated.');
});

module.exports = { list, recalculate };
