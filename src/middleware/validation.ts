import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Helper function to create validation middleware
function createValidator(
  dataExtractor: (req: Request) => any,
  errorMessage: string
) {
  return (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        schema.parse(dataExtractor(req));
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const errorMessages = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }));

          return res.status(400).json({
            error: 'Validation failed',
            message: errorMessage,
            details: errorMessages,
            timestamp: new Date().toISOString()
          });
        }
        
        next(error);
      }
    };
  };
}

// Exported validation functions
export const validateRequest = createValidator(
  (req) => req.body,
  'Request body contains invalid data'
);

export const validateParams = createValidator(
  (req) => req.params,
  'Request parameters contain invalid data'
);

export const validateQuery = createValidator(
  (req) => req.query,
  'Query parameters contain invalid data'
);