const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const ApiError = require('./utils/apiError');

const app = express();

// --- Core middleware ---
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// --- Routes ---
// Base URL is always /api/v1 (contract §3) — never introduce a new version casually.
app.use('/api/v1', routes);

// --- 404 for anything under /api/v1 that didn't match ---
app.use('/api/v1', (req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `No route: ${req.method} ${req.originalUrl}`));
});

// --- Global error handler — must be last ---
app.use(errorMiddleware);

module.exports = app;
