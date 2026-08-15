const authService = require('./auth.service');
const { validateRegister, validateLogin, validateRefreshToken } = require('./auth.validation');
const apiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  validateRegister(req.body);
  const user = await authService.register(req.body);
  return apiResponse(res, 201, user, 'Account created.');
});

const login = asyncHandler(async (req, res) => {
  validateLogin(req.body);
  const result = await authService.login(req.body);
  return apiResponse(res, 200, result);
});

const refreshTokenHandler = asyncHandler(async (req, res) => {
  validateRefreshToken(req.body);
  const result = await authService.refreshToken(req.body.refreshToken);
  return apiResponse(res, 200, result);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.mongoId);
  return apiResponse(res, 200, {}, 'Logged out.');
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.mongoId);
  return apiResponse(res, 200, user);
});

module.exports = { register, login, refreshToken: refreshTokenHandler, logout, me };
