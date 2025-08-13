import { ZodError } from 'zod';
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Global error handling middleware
 * Must be registered last, after all routes
 */
export const errorHandler = (err, req, res, next) => {
    // If headers are already sent, delegate to Express default error handler
    if (res.headersSent) {
        return next(err);
    }
    // Log the error with context
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    // Default error response
    const errorResponse = {
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 500,
        requestId: req.headers['x-request-id'] || 'unknown'
    };
    // Handle specific error types
    if (err instanceof ZodError) {
        errorResponse.status = 400;
        errorResponse.error = 'Validation Error';
        errorResponse.message = 'Request data validation failed';
        errorResponse.details = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
        }));
    }
    else if (err.name === 'ValidationError') {
        errorResponse.status = 400;
        errorResponse.error = 'Validation Error';
    }
    else if (err.name === 'CastError') {
        errorResponse.status = 400;
        errorResponse.error = 'Invalid ID Format';
    }
    else if (err.code === '23505') {
        // PostgreSQL unique constraint violation
        errorResponse.status = 409;
        errorResponse.error = 'Duplicate Entry';
        errorResponse.message = 'A record with this data already exists';
    }
    else if (err.code === '23503') {
        // PostgreSQL foreign key constraint violation
        errorResponse.status = 400;
        errorResponse.error = 'Reference Error';
        errorResponse.message = 'Referenced record does not exist';
    }
    else if (err.code === '23502') {
        // PostgreSQL not null constraint violation
        errorResponse.status = 400;
        errorResponse.error = 'Missing Required Field';
        errorResponse.message = 'A required field is missing';
    }
    else if (err.code === '22P02') {
        // PostgreSQL invalid input syntax
        errorResponse.status = 400;
        errorResponse.error = 'Invalid Data Format';
        errorResponse.message = 'The provided data format is invalid';
    }
    else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        errorResponse.status = 503;
        errorResponse.error = 'Service Unavailable';
        errorResponse.message = 'Database connection failed';
    }
    else if (err instanceof SyntaxError && err.message.includes('JSON')) {
        errorResponse.status = 400;
        errorResponse.error = 'Invalid JSON';
        errorResponse.message = 'Request body contains invalid JSON';
    }
    else if (err.code === 'TIMEOUT') {
        errorResponse.status = 408;
        errorResponse.error = 'Request Timeout';
        errorResponse.message = 'The request took too long to complete';
    }
    else if (err.statusCode === 429) {
        errorResponse.status = 429;
        errorResponse.error = 'Too Many Requests';
        errorResponse.message = 'Rate limit exceeded';
    }
    // Don't expose internal errors in production
    if (errorResponse.status >= 500 && process.env.NODE_ENV === 'production') {
        errorResponse.message = 'Internal Server Error';
        delete errorResponse.details;
    }
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }
    res.status(errorResponse.status).json(errorResponse);
};
/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res) => {
    const errorResponse = {
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        path: req.path,
        status: 404,
        requestId: req.headers['x-request-id'] || 'unknown'
    };
    res.status(404).json(errorResponse);
};
export function createCustomError(message, statusCode = 500) {
    return new AppError(message, statusCode);
}
