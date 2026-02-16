/**
 * Atlas: Echoes of Earth — Express Server
 * Main entry point for the application.
 * Configures security, compression, logging, and routing middleware.
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./src/routes/api');
const { requestIdMiddleware } = require('./src/middleware/requestId');
const { logger } = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------
// Request ID + Tracing
// ---------------------
app.use(requestIdMiddleware);

// ---------------------
// Response Compression
// ---------------------
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ---------------------
// Security Middleware
// ---------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com",
        "https://*.google.com",
        "https://*.googleusercontent.com",
      ],
      connectSrc: ["'self'", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://maps.googleapis.com"],
      mediaSrc: ["'self'", "blob:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || false
    : true,
}));

// Rate limiting — 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use('/api', apiLimiter);

// ---------------------
// Body Parsing
// ---------------------
app.use(express.json({ limit: '1mb' }));

// ---------------------
// Request Logging
// ---------------------
app.use((req, res, next) => {
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    if (req.path.startsWith('/api')) {
      logger.info('API request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.id,
      });
    }
  });
  next();
});

// ---------------------
// Inject Google Maps Key into frontend
// ---------------------
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'public, max-age=300');
  res.send(`window.__ATLAS_CONFIG__={MAPS_API_KEY:"${process.env.GOOGLE_MAPS_API_KEY || ''}"};`);
});

// ---------------------
// Static Files (with caching)
// ---------------------
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// ---------------------
// API Routes
// ---------------------
app.use('/api', apiRoutes);

// ---------------------
// SPA Fallback
// ---------------------
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------
// Global Error Handler
// ---------------------
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req?.path,
    requestId: req?.id,
  });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ---------------------
// Start Server
// ---------------------
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      url: `http://localhost:${PORT}`,
    });
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
