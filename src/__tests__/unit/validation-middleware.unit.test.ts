import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateParams, validateQuery } from '../../middleware/validation.js';
import { z } from 'zod';

// Mock Express request/response objects
const mockRequest = (data: any, target: 'body' | 'params' | 'query' = 'body') => {
  const req = {
    body: target === 'body' ? data : {},
    params: target === 'params' ? data : {},
    query: target === 'query' ? data : {},
    path: '/test',
    method: 'POST'
  } as Request;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
};

const mockNext = () => jest.fn() as NextFunction;

describe('Validation Middleware Unit Tests', () => {
  let mockRes: Response;
  let mockNextFunction: NextFunction;

  beforeEach(() => {
    mockRes = mockResponse();
    mockNextFunction = mockNext();
  });

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(120),
      email: z.string().email()
    });

    it('should pass validation with valid request body', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };
      const mockReq = mockRequest(validData, 'body');
      const validator = validateRequest(testSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid request body', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'invalid-email'
      };
      const mockReq = mockRequest(invalidData, 'body');
      const validator = validateRequest(testSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: 'Request body contains invalid data',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'email',
            message: expect.any(String)
          })
        ]),
        timestamp: expect.any(String)
      });
      expect(mockNextFunction).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        name: 'John'
        // missing age and email
      };
      const mockReq = mockRequest(incompleteData, 'body');
      const validator = validateRequest(testSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'age' }),
            expect.objectContaining({ field: 'email' })
          ])
        })
      );
    });

    it('should pass non-Zod errors to next middleware', () => {
      const customError = new Error('Custom error');
      const throwingSchema = {
        parse: jest.fn().mockImplementation(() => {
          throw customError;
        })
      } as any;

      const mockReq = mockRequest({}, 'body');
      const validator = validateRequest(throwingSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith(customError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should include valid ISO timestamp in error response', () => {
      const invalidData = { name: '' };
      const mockReq = mockRequest(invalidData, 'body');
      const validator = validateRequest(testSchema);

      validator(mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      const timestamp = new Date(call.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(call.timestamp);
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
      category: z.string().min(1)
    });

    it('should pass validation with valid params', () => {
      const validParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        category: 'electronics'
      };
      const mockReq = mockRequest(validParams, 'params');
      const validator = validateParams(paramsSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid params', () => {
      const invalidParams = {
        id: 'not-a-uuid',
        category: ''
      };
      const mockReq = mockRequest(invalidParams, 'params');
      const validator = validateParams(paramsSchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: 'Request parameters contain invalid data',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.any(String)
          }),
          expect.objectContaining({
            field: 'category',
            message: expect.any(String)
          })
        ]),
        timestamp: expect.any(String)
      });
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1)),
      limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
      sort: z.enum(['asc', 'desc']).optional()
    });

    it('should pass validation with valid query parameters', () => {
      const validQuery = {
        page: '1',
        limit: '10',
        sort: 'asc'
      };
      const mockReq = mockRequest(validQuery, 'query');
      const validator = validateQuery(querySchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid query parameters', () => {
      const invalidQuery = {
        page: 'invalid',
        limit: '200',
        sort: 'invalid-sort'
      };
      const mockReq = mockRequest(invalidQuery, 'query');
      const validator = validateQuery(querySchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        message: 'Query parameters contain invalid data',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ]),
        timestamp: expect.any(String)
      });
    });

    it('should handle optional query parameters', () => {
      const partialQuery = {
        page: '1',
        limit: '10'
        // sort is optional
      };
      const mockReq = mockRequest(partialQuery, 'query');
      const validator = validateQuery(querySchema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith();
    });
  });

  describe('Error Response Format', () => {
    const simpleSchema = z.object({
      required: z.string()
    });

    it('should include error codes in validation details', () => {
      const mockReq = mockRequest({}, 'body');
      const validator = validateRequest(simpleSchema);

      validator(mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.details[0]).toHaveProperty('code');
      expect(call.details[0]).toHaveProperty('field');
      expect(call.details[0]).toHaveProperty('message');
    });

    it('should handle nested field paths', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1)
          })
        })
      });

      const invalidNested = {
        user: {
          profile: {
            name: ''
          }
        }
      };

      const mockReq = mockRequest(invalidNested, 'body');
      const validator = validateRequest(nestedSchema);

      validator(mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.details[0].field).toBe('user.profile.name');
    });

    it('should handle array field paths', () => {
      const arraySchema = z.object({
        items: z.array(z.object({
          name: z.string().min(1)
        }))
      });

      const invalidArray = {
        items: [
          { name: 'valid' },
          { name: '' }, // invalid
          { name: 'also valid' }
        ]
      };

      const mockReq = mockRequest(invalidArray, 'body');
      const validator = validateRequest(arraySchema);

      validator(mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.details[0].field).toBe('items.1.name');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request body', () => {
      const schema = z.object({}).strict();
      const mockReq = mockRequest({}, 'body');
      const validator = validateRequest(schema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockNextFunction).toHaveBeenCalledWith();
    });

    it('should handle null request body', () => {
      const schema = z.object({
        name: z.string().optional()
      });
      const mockReq = mockRequest(null, 'body');
      const validator = validateRequest(schema);

      validator(mockReq, mockRes, mockNextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle very large error responses', () => {
      const manyFieldsSchema = z.object(
        Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`field${i}`, z.string()])
        )
      );

      const mockReq = mockRequest({}, 'body');
      const validator = validateRequest(manyFieldsSchema);

      validator(mockReq, mockRes, mockNextFunction);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.details).toHaveLength(50);
    });
  });
});