import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  status: number;
}

/**
 * Global error handling middleware
 * Must be registered last, after all routes
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught by error handler:', err);

  // Default error response
  const errorResponse = {
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    status: 500,
  } satisfies ErrorResponse;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.status = 400;
    errorResponse.error = 'Validation Error';
  } else if (err.name === 'CastError') {
    errorResponse.status = 400;
    errorResponse.error = 'Invalid ID Format';
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    errorResponse.status = 409;
    errorResponse.error = 'Duplicate Entry';
    errorResponse.message = 'A record with this data already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key constraint violation
    errorResponse.status = 400;
    errorResponse.error = 'Reference Error';
    errorResponse.message = 'Referenced record does not exist';
  }

  res.status(errorResponse.status).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
    status: 404,
  } satisfies ErrorResponse;

  res.status(404).json(errorResponse);
};
