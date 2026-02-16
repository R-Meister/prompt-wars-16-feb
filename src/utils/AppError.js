/**
 * Custom Application Error Classes
 * Provides structured error types with HTTP status codes for consistent
 * error handling across all routes and middleware.
 * @module utils/AppError
 */

/**
 * Base application error with HTTP status and operational flag.
 * @extends Error
 */
class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message
     * @param {number} statusCode - HTTP status code
     * @param {string} [code] - Machine-readable error code
     */
    constructor(message, statusCode, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code || 'INTERNAL_ERROR';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 Bad Request — invalid input or missing required fields.
 * @extends AppError
 */
class ValidationError extends AppError {
    /**
     * @param {string} message - Description of the validation failure
     * @param {string} [field] - The specific field that failed validation
     */
    constructor(message, field) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

/**
 * 404 Not Found — requested resource does not exist.
 * @extends AppError
 */
class NotFoundError extends AppError {
    /**
     * @param {string} resource - The type of resource not found
     * @param {string} [identifier] - The identifier used in the lookup
     */
    constructor(resource, identifier) {
        super(`${resource}${identifier ? ` '${identifier}'` : ''} not found`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

/**
 * 503 Service Unavailable — an external dependency is down.
 * @extends AppError
 */
class ServiceUnavailableError extends AppError {
    /**
     * @param {string} service - The name of the unavailable service
     */
    constructor(service) {
        super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
        this.service = service;
    }
}

module.exports = { AppError, ValidationError, NotFoundError, ServiceUnavailableError };
