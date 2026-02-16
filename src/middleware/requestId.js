/**
 * Request ID Middleware
 * Generates a unique identifier for each request for traceability.
 * Attaches the ID to req.id and sets the X-Request-Id response header.
 * @module middleware/requestId
 */

const crypto = require('crypto');

/**
 * Express middleware that assigns a unique request ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requestIdMiddleware(req, res, next) {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);

    // Attach start time for latency tracking
    req.startTime = Date.now();

    next();
}

module.exports = { requestIdMiddleware };
