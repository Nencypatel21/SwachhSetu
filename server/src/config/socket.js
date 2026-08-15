const { Server } = require('socket.io');
const env = require('./env');

let io = null;

/**
 * Attaches Socket.io to the existing HTTP server. Called once from server.js.
 * No event handlers/namespaces are registered here — the `vehicle:locationUpdate`
 * event (contract §8) is added when B5/B6 build the vehicles module.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/** Lets later modules (e.g. vehicles controller) emit without re-importing socket.io directly. */
function getIO() {
  if (!io) {
    throw new Error('[socket] getIO() called before initSocket() — check server.js boot order.');
  }
  return io;
}

module.exports = { initSocket, getIO };
