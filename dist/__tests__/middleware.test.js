import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { asyncHandler, errorHandler, notFoundHandler } from '../middleware/index.js';
// Mock Express request/response objects
const mockRequest = (overrides = {}) => ({
    path: '/test',
    method: 'GET',
    ...overrides,
});
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const mockNext = () => jest.fn();
describe('Middleware Tests', () => {
    describe('asyncHandler', () => {
        let mockReq;
        let mockRes;
        let mockNextFunction;
        beforeEach(() => {
            mockReq = mockRequest();
            mockRes = mockResponse();
            mockNextFunction = mockNext();
        });
        it('should handle successful async operations', async () => {
            const asyncOperation = jest.fn().mockResolvedValue('success');
            const handler = asyncHandler(async (_req, res, _next) => {
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
            const asyncOperation = jest.fn().mockRejectedValue(error);
            const handler = asyncHandler(async (_req, _res, _next) => {
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
            const handler = asyncHandler(async (_req, _res, _next) => {
                throw error;
            });
            await handler(mockReq, mockRes, mockNextFunction);
            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });
        it('should pass through request, response, and next parameters', async () => {
            let capturedReq;
            let capturedRes;
            let capturedNext;
            const handler = asyncHandler(async (req, res, next) => {
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
        let mockReq;
        let mockRes;
        let mockNextFunction;
        let consoleSpy;
        beforeEach(() => {
            mockReq = mockRequest({ path: '/test-error' });
            mockRes = mockResponse();
            mockNextFunction = mockNext();
            consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        });
        afterEach(() => {
            consoleSpy.mockRestore();
        });
        it('should handle generic errors with 500 status', () => {
            const error = new Error('Generic error message');
            errorHandler(error, mockReq, mockRes, mockNextFunction);
            expect(consoleSpy).toHaveBeenCalledWith('Error caught by error handler:', error);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Generic error message',
                timestamp: expect.any(String),
                path: '/test-error',
                status: 500,
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
            });
        });
        it('should handle PostgreSQL unique constraint violation (23505)', () => {
            const error = new Error('Duplicate key value violates unique constraint');
            error.code = '23505';
            errorHandler(error, mockReq, mockRes, mockNextFunction);
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Duplicate Entry',
                message: 'A record with this data already exists',
                timestamp: expect.any(String),
                path: '/test-error',
                status: 409,
            });
        });
        it('should handle PostgreSQL foreign key constraint violation (23503)', () => {
            const error = new Error('Foreign key constraint violation');
            error.code = '23503';
            errorHandler(error, mockReq, mockRes, mockNextFunction);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Reference Error',
                message: 'Referenced record does not exist',
                timestamp: expect.any(String),
                path: '/test-error',
                status: 400,
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
            });
        });
        it('should include valid ISO timestamp', () => {
            const error = new Error('Test error');
            errorHandler(error, mockReq, mockRes, mockNextFunction);
            const call = mockRes.json.mock.calls[0][0];
            const timestamp = new Date(call.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.toISOString()).toBe(call.timestamp);
        });
    });
    describe('notFoundHandler', () => {
        let mockReq;
        let mockRes;
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
            });
        });
        it('should include valid ISO timestamp', () => {
            mockReq = mockRequest({ path: '/test', method: 'DELETE' });
            notFoundHandler(mockReq, mockRes);
            const call = mockRes.json.mock.calls[0][0];
            const timestamp = new Date(call.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.toISOString()).toBe(call.timestamp);
        });
    });
});
