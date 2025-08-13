import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler, errorHandler, notFoundHandler } from '../middleware/index.js';

// Mock Express request/response objects
const mockRequest = (overrides = {}) => ({
  path: '/test',
  method: 'GET',
  headers: {
    'x-request-id': 'test-request-id',
    'user-agent': 'Jest Test Agent'
  },
  get: jest.fn((header: string) => {
    if (header === 'User-Agent') return 'Jest Test Agent';
    if (header === 'x-request-id') return 'test-request-id';
    return undefined;
  }),
  ip: '127.0.0.1',
  ...overrides,
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
};

const mockNext = () => jest.fn() as NextFunction;

describe('Middleware Tests', () => {
  describe('asyncHandler', () => {
    let mockReq: Request;
    let mockRes: Response;
    let mockNextFunction: NextFunction;

    beforeEach(() => {
      mockReq = mockRequest();
      mockRes = mockResponse();
      mockNextFunction = mockNext();
    });

    it('should handle successful async operations', async () => {
      const asyncOperation = jest.fn().mockResolvedValue('success') as any;
      const handler = asyncHandler(async (_req: any, res: any, _next: any) => {
        const result = await asyncOperation();
        res.json({ result });
      });

      await handler(mockReq, mockRes, mockNextFunction);

      expect(asyncOperation).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ result: 'success' });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors to next middleware', async () => {
      const error = new Error('Async operation failed');
      const asyncOperation = jest.fn().mockRejectedValue(error) as any;
      
      const handler = asyncHandler(async (_req: any, _res: any, _next: any) => {
        await asyncOperation();
      });

      // Call the handler - it doesn't return a promise, it calls next() with the error
      handler(mockReq, mockRes, mockNextFunction);
      
      // Give the promise a chance to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(asyncOperation).toHaveBeenCalled();
      expect(mockNextFunction).toHaveBeenCalledWith(error);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle synchronous errors in async handlers', async () => {
      const error = new Error('Sync error in async handler');
      
      const handler = asyncHandler(async (_req: any, _res: any, _next: any) => {
        throw error;
      });

      await handler(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith(error);
    });

    it('should pass through request, response, and next parameters', async () => {
      let capturedReq: Request | undefined;
      let capturedRes: Response | undefined;
      let capturedNext: NextFunction | undefined;

      const handler = asyncHandler(async (req: any, res: any, next: any) => {
        capturedReq = req;
        capturedRes = res;
        capturedNext = next;
      });

      await handler(mockReq, mockRes, mockNextFunction);

      expect(capturedReq).toBe(mockReq);
      expect(capturedRes).toBe(mockRes);
      expect(capturedNext).toBe(mockNextFunction);
    });
  });

  describe('errorHandler', () => {
    let mockReq: Request;
    let mockRes: Response;
    let mockNextFunction: NextFunction;
    let consoleSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      mockReq = mockRequest({ path: '/test-error' });
      mockRes = mockResponse();
      mockNextFunction = mockNext();
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Generic error message');
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(consoleSpy).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
        message: 'Generic error message',
        method: 'GET'
      }));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Generic error message',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 500,
        requestId: 'test-request-id'
      });
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Invalid input data');
      error.name = 'ValidationError';
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Invalid input data',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 400,
        requestId: 'test-request-id'
      });
    });

    it('should handle CastError with 400 status', () => {
      const error = new Error('Invalid ID format');
      error.name = 'CastError';
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid ID Format',
        message: 'Invalid ID format',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 400,
        requestId: 'test-request-id'
      });
    });

    it('should handle PostgreSQL unique constraint violation (23505)', () => {
      const error = new Error('Duplicate key value violates unique constraint');
      (error as any).code = '23505';
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Duplicate Entry',
        message: 'A record with this data already exists',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 409,
        requestId: 'test-request-id'
      });
    });

    it('should handle PostgreSQL foreign key constraint violation (23503)', () => {
      const error = new Error('Foreign key constraint violation');
      (error as any).code = '23503';
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Reference Error',
        message: 'Referenced record does not exist',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 400,
        requestId: 'test-request-id'
      });
    });

    it('should handle errors without message property', () => {
      const error = { name: 'SomeError' };
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: expect.any(String),
        path: '/test-error',
        status: 500,
        requestId: 'test-request-id'
      });
    });

    it('should include valid ISO timestamp', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      const timestamp = new Date(call.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(call.timestamp);
    });
  });

  describe('notFoundHandler', () => {
    let mockReq: Request;
    let mockRes: Response;

    beforeEach(() => {
      mockRes = mockResponse();
    });

    it('should handle GET requests to non-existent routes', () => {
      mockReq = mockRequest({ path: '/non-existent', method: 'GET' });
      
      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Route GET /non-existent not found',
        timestamp: expect.any(String),
        path: '/non-existent',
        status: 404,
        requestId: 'test-request-id'
      });
    });

    it('should handle POST requests to non-existent routes', () => {
      mockReq = mockRequest({ path: '/api/missing', method: 'POST' });
      
      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Route POST /api/missing not found',
        timestamp: expect.any(String),
        path: '/api/missing',
        status: 404,
        requestId: 'test-request-id'
      });
    });

    it('should include valid ISO timestamp', () => {
      mockReq = mockRequest({ path: '/test', method: 'DELETE' });
      
      notFoundHandler(mockReq, mockRes);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      const timestamp = new Date(call.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(call.timestamp);
    });
  });
});