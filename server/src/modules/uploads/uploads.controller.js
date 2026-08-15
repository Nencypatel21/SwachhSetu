const uploadsService = require('./uploads.service');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const reportImage = asyncHandler(async (req, res) => {
  const result = await uploadsService.uploadReportImage(req.file);
  return apiResponse(res, 201, result);
});

module.exports = { reportImage };
