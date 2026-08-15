const http = require('http');

const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] SwachhSetu API running on port ${env.port} (${env.nodeEnv})`);
    console.log(`[server] Health check: http://localhost:${env.port}/api/v1/health`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
