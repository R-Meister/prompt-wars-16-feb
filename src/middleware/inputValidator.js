/**
 * Input Validation Middleware
 * Provides schema-based request validation for Express routes.
 * Rejects malformed input early with clear error messages.
 * @module middleware/inputValidator
 */

const { ValidationError } = require('../utils/AppError');

/**
 * @typedef {Object} FieldSchema
 * @property {'string'|'number'|'boolean'|'array'|'object'} type - Expected JS type
 * @property {boolean} [required] - Whether the field is required
 * @property {number} [minLength] - Minimum string length
 * @property {number} [maxLength] - Maximum string length
 * @property {number} [min] - Minimum numeric value
 * @property {number} [max] - Maximum numeric value
 */

/**
 * Validate a single field value against its schema definition.
 * @param {string} name - Field name for error messages
 * @param {*} value - Actual value to validate
 * @param {FieldSchema} schema - Validation rules
 * @returns {string|null} Error message or null if valid
 */
function validateField(name, value, schema) {
    if (schema.required && (value === undefined || value === null || value === '')) {
        return `${name} is required`;
    }

    if (value === undefined || value === null) return null;

    // Type check
    if (schema.type === 'array') {
        if (!Array.isArray(value)) return `${name} must be an array`;
    } else if (typeof value !== schema.type) {
        return `${name} must be a ${schema.type}`;
    }

    // String constraints
    if (schema.type === 'string' && typeof value === 'string') {
        if (schema.minLength && value.trim().length < schema.minLength) {
            return `${name} must be at least ${schema.minLength} characters`;
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            return `${name} must not exceed ${schema.maxLength} characters`;
        }
    }

    // Numeric constraints
    if (schema.type === 'number' && typeof value === 'number') {
        if (schema.min !== undefined && value < schema.min) {
            return `${name} must be at least ${schema.min}`;
        }
        if (schema.max !== undefined && value > schema.max) {
            return `${name} must not exceed ${schema.max}`;
        }
    }

    return null;
}

/**
 * Create validation middleware for request body.
 * @param {Object<string, FieldSchema>} schema - Field name → schema map
 * @returns {import('express').RequestHandler} Express middleware
 * @example
 *   router.post('/validate-city', validateBody({
 *     city: { type: 'string', required: true, minLength: 1, maxLength: 100 },
 *   }), handler);
 */
function validateBody(schema) {
    return (req, _res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const error = validateField(field, req.body[field], rules);
            if (error) errors.push(error);
        }

        if (errors.length > 0) {
            return next(new ValidationError(errors.join('; ')));
        }

        next();
    };
}

/**
 * Create validation middleware for query parameters.
 * @param {Object<string, FieldSchema>} schema - Param name → schema map
 * @returns {import('express').RequestHandler} Express middleware
 */
function validateQuery(schema) {
    return (req, _res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            let value = req.query[field];

            // Coerce query strings to expected types
            if (value !== undefined && rules.type === 'number') {
                value = Number(value);
                if (Number.isNaN(value)) {
                    errors.push(`${field} must be a valid number`);
                    continue;
                }
                req.query[field] = value;
            }

            const error = validateField(field, value, rules);
            if (error) errors.push(error);
        }

        if (errors.length > 0) {
            return next(new ValidationError(errors.join('; ')));
        }

        next();
    };
}

module.exports = { validateBody, validateQuery, validateField };
