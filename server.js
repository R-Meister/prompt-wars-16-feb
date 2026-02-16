/**
 * Atlas: Echoes of Earth — Express Server
 * Main entry point for the application
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

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
        "https://maps.gstatic.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com",
        "https://*.google.com",
        "https://*.googleusercontent.com"
      ],
      connectSrc: ["'self'", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://maps.googleapis.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || false
    : true
}));

// Rate limiting — 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

app.use('/api', apiLimiter);

// ---------------------
// Body Parsing
// ---------------------
app.use(express.json({ limit: '1mb' }));

// ---------------------
// Inject Google Maps Key into frontend
// ---------------------
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.__ATLAS_CONFIG__={MAPS_API_KEY:"${process.env.GOOGLE_MAPS_API_KEY || ''}"};`);
});

// ---------------------
// Static Files
// ---------------------
app.use(express.static(path.join(__dirname, 'public')));

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
app.use((err, _req, res, _next) => {
  console.error('[Atlas Error]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// ---------------------
// Start Server
// ---------------------
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🌍 Atlas: Echoes of Earth`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
