const http = require('http');

const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { startVehicleSimulator } = require('./jobs/vehicleSimulator');
const { startHotspotRecalcJob } = require('./jobs/hotspotRecalcJob');

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] SwachhSetu API running on port ${env.port} (${env.nodeEnv})`);
    console.log(`[server] Health check: http://localhost:${env.port}/api/v1/health`);

    // B6 — vehicle simulator self-calls POST /vehicles/:id/location over
    // HTTP, so it must start only after the server is actually accepting
    // connections (i.e. inside this listen callback, not before it).
    startVehicleSimulator();
    // B7 — hotspot recalc runs in-process (no HTTP self-call needed), but
    // is started here too so both cron jobs are wired in one obvious place.
    startHotspotRecalcJob();
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
