const Vehicle = require('../../models/Vehicle');
const ApiError = require('../../utils/apiError');
const { getIO } = require('../../config/socket');
const { parsePagination, buildPaginationMeta } = require('../../utils/paginate');

function toVehicleResponse(vehicle) {
  return {
    id: vehicle.vehicleId,
    plateNumber: vehicle.plateNumber,
    type: vehicle.type,
    capacityKg: vehicle.capacityKg,
    status: vehicle.status,
    currentLocation: vehicle.currentLocation,
    speedKmph: vehicle.speedKmph,
    locationSource: vehicle.locationSource,
    lastLocationUpdate: vehicle.lastLocationUpdate,
  };
}

/** §8 POST /vehicles — Role: admin. */
async function createVehicle({ plateNumber, type, capacityKg }) {
  const existing = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase().trim() });
  if (existing) {
    throw new ApiError(409, 'PLATE_ALREADY_EXISTS', 'A vehicle with this plate number already exists.');
  }

  const vehicle = await Vehicle.create({ plateNumber, type, capacityKg });
  return toVehicleResponse(vehicle);
}

/** §8 GET /vehicles — Role: staff/admin. Optional ?status= filter. */
async function listVehicles(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;

  const [items, totalItems] = await Promise.all([
    Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Vehicle.countDocuments(filter),
  ]);

  return {
    items: items.map(toVehicleResponse),
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
}

/**
 * §8 POST /vehicles/:id/location.
 * Caller is either the MVP simulator (req.isInternalService) or, in Phase 2,
 * an authenticated staff/admin driver device — both paths reach this
 * function identically, per allowStaffOrInternalService in
 * internalService.middleware.js. Defaults `source` when the caller didn't
 * send one, based on which path it came through.
 */
async function updateLocation(vehicleId, { location, speedKmph, source }, isInternalService) {
  const vehicle = await Vehicle.findOne({ vehicleId });
  if (!vehicle) throw new ApiError(404, 'VEHICLE_NOT_FOUND', `Vehicle ${vehicleId} does not exist.`);

  vehicle.currentLocation = location;
  vehicle.speedKmph = speedKmph !== undefined ? speedKmph : vehicle.speedKmph;
  vehicle.locationSource = source || (isInternalService ? 'simulator' : 'device');
  vehicle.lastLocationUpdate = new Date();
  await vehicle.save();

  const payload = {
    vehicleId: vehicle.vehicleId,
    location: vehicle.currentLocation,
    source: vehicle.locationSource,
    timestamp: vehicle.lastLocationUpdate.toISOString(),
  };

  // §8 WebSocket: vehicle:locationUpdate — emitted on every ping.
  try {
    getIO().emit('vehicle:locationUpdate', payload);
  } catch (err) {
    // Socket not initialized (e.g. isolated unit test) shouldn't fail the write itself.
    console.warn('[vehicles] could not emit vehicle:locationUpdate:', err.message);
  }

  return payload;
}

/** §8 GET /vehicles/live — Role: admin. Latest position of every vehicle. */
async function liveVehicles() {
  const vehicles = await Vehicle.find({});
  return vehicles.map(toVehicleResponse);
}

module.exports = { createVehicle, listVehicles, updateLocation, liveVehicles };
