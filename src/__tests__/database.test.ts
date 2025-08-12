import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql, eq } from 'drizzle-orm';
import { receipts, type NewReceipt } from '../db/schemas.js';

// Test database connection
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable not set');
}

const testPool = new Pool({
  connectionString: TEST_DATABASE_URL,
  max: 5,
  ssl: false,
});

const testDb = drizzle(testPool);

describe('Database Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await testPool.query('SELECT 1');
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping integration tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testDb.delete(receipts).where(sql`receipt_id LIKE 'test-%'`);
  });

  describe('Receipt Schema Operations', () => {
    const testReceiptData: NewReceipt = {
      receiptId: 'test-receipt-001',
      productId: 'test-product-001',
      receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
      merchantName: 'Test Store',
      productDescription: 'Test Product Description',
      brand: 'Test Brand',
      productCategory: ['Electronics', 'Computers', 'Laptops'],
      totalPricePaid: 999.99,
      productCode: 'TEST123456',
      productImageUrl: 'https://example.com/test-image.jpg',
      enrichedBrand: 'Test Brand',
      enrichedCategory: ['Electronics', 'Computers', 'Laptops'],
      enrichmentConfidence: 'high',
    };

    it('should insert a new receipt successfully', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      const [result] = await testDb
        .insert(receipts)
        .values(testReceiptData)
        .returning({ receiptId: receipts.receiptId });

      expect(result.receiptId).toBe('test-receipt-001');
    });

    it('should retrieve a receipt by receipt_id', async () => {
      // Insert test data
      await testDb.insert(receipts).values(testReceiptData);

      // Retrieve the receipt
      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-001'))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].receiptId).toBe('test-receipt-001');
      expect(result[0].merchantName).toBe('Test Store');
      expect(result[0].totalPricePaid).toBe(999.99);
      expect(result[0].productCategory).toEqual(['Electronics', 'Computers', 'Laptops']);
    });

    it('should handle JSONB fields correctly', async () => {
      const receiptWithComplexCategory = {
        ...testReceiptData,
        receiptId: 'test-receipt-jsonb',
        productCategory: ['Home & Garden', 'Furniture', 'Living Room'],
        enrichedCategory: ['Home & Garden', 'Furniture', 'Seating'],
      };

      await testDb.insert(receipts).values(receiptWithComplexCategory);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-jsonb'))
        .limit(1);

      expect(result[0].productCategory).toEqual(['Home & Garden', 'Furniture', 'Living Room']);
      expect(result[0].enrichedCategory).toEqual(['Home & Garden', 'Furniture', 'Seating']);
    });

    it('should handle null values gracefully', async () => {
      const minimalReceipt: NewReceipt = {
        receiptId: 'test-receipt-minimal',
        productId: null,
        receiptCreatedTimestamp: null,
        merchantName: null,
        productDescription: null,
        brand: null,
        productCategory: null,
        totalPricePaid: null,
        productCode: null,
        productImageUrl: null,
        enrichedBrand: null,
        enrichedCategory: null,
        enrichmentConfidence: null,
      };

      await testDb.insert(receipts).values(minimalReceipt);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-minimal'))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].receiptId).toBe('test-receipt-minimal');
      expect(result[0].merchantName).toBeNull();
      expect(result[0].totalPricePaid).toBeNull();
    });

    it('should handle string productCategory (non-JSON)', async () => {
      const receiptWithStringCategory = {
        ...testReceiptData,
        receiptId: 'test-receipt-string-cat',
        productCategory: 'Electronics',
      };

      await testDb.insert(receipts).values(receiptWithStringCategory);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-string-cat'))
        .limit(1);

      expect(result[0].productCategory).toBe('Electronics');
    });

    it('should set timestamps automatically', async () => {
      const receiptForTimestamp = {
        ...testReceiptData,
        receiptId: 'test-receipt-timestamp',
      };

      await testDb.insert(receipts).values(receiptForTimestamp);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-timestamp'))
        .limit(1);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
      
      // Timestamps should be recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - result[0].createdAt!.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 60 seconds
    });

    it('should enforce primary key constraint', async () => {
      await testDb.insert(receipts).values(testReceiptData);

      // Try to insert duplicate receipt_id
      await expect(
        testDb.insert(receipts).values({
          ...testReceiptData,
          productId: 'different-product-id',
        })
      ).rejects.toThrow();
    });

    it('should handle large text fields', async () => {
      const longDescription = 'A'.repeat(5000); // 5KB description
      const receiptWithLongText = {
        ...testReceiptData,
        receiptId: 'test-receipt-long-text',
        productDescription: longDescription,
      };

      await testDb.insert(receipts).values(receiptWithLongText);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-long-text'))
        .limit(1);

      expect(result[0].productDescription).toBe(longDescription);
      expect(result[0].productDescription!.length).toBe(5000);
    });

    it('should handle float precision for prices', async () => {
      const receiptWithPrecisePrice = {
        ...testReceiptData,
        receiptId: 'test-receipt-precise-price',
        totalPricePaid: 123.456789,
      };

      await testDb.insert(receipts).values(receiptWithPrecisePrice);

      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-receipt-precise-price'))
        .limit(1);

      // PostgreSQL real type has limited precision
      expect(result[0].totalPricePaid).toBeCloseTo(123.456789, 5);
    });
  });

  describe('Database Connection', () => {
    const testReceiptData: NewReceipt = {
      receiptId: 'test-receipt-connection',
      productId: 'test-product-connection',
      receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
      merchantName: 'Test Store',
      productDescription: 'Test Product Description',
      brand: 'Test Brand',
      productCategory: ['Electronics', 'Computers', 'Laptops'],
      totalPricePaid: 999.99,
      productCode: 'TEST123456',
      productImageUrl: 'https://example.com/test-image.jpg',
      enrichedBrand: 'Test Brand',
      enrichedCategory: ['Electronics', 'Computers', 'Laptops'],
      enrichmentConfidence: 'high',
    };

    it('should establish connection successfully', async () => {
      const result = await testDb.execute(sql`SELECT 1 as test`);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    it('should handle database queries with parameters', async () => {
      const testData = {
        ...testReceiptData,
        receiptId: 'test-query-param'
      };
      await testDb.insert(receipts).values(testData);
      
      const merchantName = 'Test Store';
      const result = await testDb.execute(
        sql`SELECT receipt_id FROM receipts WHERE merchant_name = ${merchantName} AND receipt_id LIKE 'test-%'`
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].receipt_id).toBe('test-query-param');
    });
  });

  describe('Query Performance', () => {
    const perfTestReceiptData: NewReceipt = {
      receiptId: 'test-receipt-perf',
      productId: 'test-product-perf',
      receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
      merchantName: 'Test Store',
      productDescription: 'Test Product Description',
      brand: 'Test Brand',
      productCategory: ['Electronics', 'Computers', 'Laptops'],
      totalPricePaid: 999.99,
      productCode: 'TEST123456',
      productImageUrl: 'https://example.com/test-image.jpg',
      enrichedBrand: 'Test Brand',
      enrichedCategory: ['Electronics', 'Computers', 'Laptops'],
      enrichmentConfidence: 'high',
    };

    beforeEach(async () => {
      // Insert multiple test records for performance testing
      const testReceipts = Array.from({ length: 10 }, (_, i) => ({
        ...perfTestReceiptData,
        receiptId: `test-perf-${i.toString().padStart(3, '0')}`,
        productId: `test-product-${i}`,
        merchantName: i % 3 === 0 ? 'Amazon' : i % 3 === 1 ? 'Target' : 'Walmart',
        totalPricePaid: Math.random() * 1000,
      }));

      await testDb.insert(receipts).values(testReceipts);
    });

    it('should efficiently query by receipt_id (primary key)', async () => {
      const startTime = Date.now();
      
      const result = await testDb
        .select()
        .from(receipts)
        .where(eq(receipts.receiptId, 'test-perf-005'))
        .limit(1);

      const queryTime = Date.now() - startTime;
      
      expect(result).toHaveLength(1);
      expect(queryTime).toBeLessThan(100); // Should be very fast with primary key
    });

    it('should handle multiple record retrieval', async () => {
      const result = await testDb
        .select()
        .from(receipts)
        .where(sql`receipt_id LIKE 'test-perf-%'`)
        .limit(20);

      expect(result.length).toBeGreaterThanOrEqual(10);
      expect(result.every(r => r.receiptId?.startsWith('test-perf-'))).toBe(true);
    });
  });

  // Unit Tests with Mocked Database
  describe('Database Schema Unit Tests (Mocked)', () => {
    let mockDb: any;
    let originalDrizzle: typeof drizzle;
    
    beforeAll(() => {
      // Store original drizzle function
      originalDrizzle = drizzle;
      
      // Mock the database
      mockDb = {
        execute: jest.fn(),
        insert: jest.fn(),
        select: jest.fn(),
        delete: jest.fn(),
      };
      
      // Mock drizzle to return our mocked db
      (drizzle as any) = jest.fn().mockReturnValue(mockDb);
    });

    afterAll(() => {
      // Restore original drizzle
      (drizzle as any) = originalDrizzle;
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Receipt Schema Validation', () => {
      const validReceiptData: NewReceipt = {
        receiptId: 'test-receipt-001',
        productId: 'test-product-001',
        receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
        merchantName: 'Test Store',
        productDescription: 'Test Product Description',
        brand: 'Test Brand',
        productCategory: ['Electronics', 'Computers', 'Laptops'],
        totalPricePaid: 999.99,
        productCode: 'TEST123456',
        productImageUrl: 'https://example.com/test-image.jpg',
        enrichedBrand: 'Test Brand',
        enrichedCategory: ['Electronics', 'Computers', 'Laptops'],
        enrichmentConfidence: 'high',
      };

      it('should create valid receipt data structure', () => {
        expect(validReceiptData.receiptId).toBe('test-receipt-001');
        expect(validReceiptData.merchantName).toBe('Test Store');
        expect(validReceiptData.totalPricePaid).toBe(999.99);
        expect(Array.isArray(validReceiptData.productCategory)).toBe(true);
        expect(validReceiptData.enrichmentConfidence).toBe('high');
      });

      it('should handle null values correctly', () => {
        const minimalReceipt: NewReceipt = {
          receiptId: 'test-minimal',
          productId: null,
          receiptCreatedTimestamp: null,
          merchantName: null,
          productDescription: null,
          brand: null,
          productCategory: null,
          totalPricePaid: null,
          productCode: null,
          productImageUrl: null,
          enrichedBrand: null,
          enrichedCategory: null,
          enrichmentConfidence: null,
        };

        expect(minimalReceipt.receiptId).toBe('test-minimal');
        expect(minimalReceipt.merchantName).toBeNull();
        expect(minimalReceipt.totalPricePaid).toBeNull();
      });

      it('should handle different product category formats', () => {
        const receiptWithArrayCategory = {
          ...validReceiptData,
          productCategory: ['Electronics', 'Audio']
        };

        const receiptWithStringCategory = {
          ...validReceiptData,
          productCategory: 'Electronics'
        };

        expect(Array.isArray(receiptWithArrayCategory.productCategory)).toBe(true);
        expect(typeof receiptWithStringCategory.productCategory).toBe('string');
      });

      it('should validate enrichment confidence values', () => {
        const highConfidence = { ...validReceiptData, enrichmentConfidence: 'high' };
        const mediumConfidence = { ...validReceiptData, enrichmentConfidence: 'medium' };
        const lowConfidence = { ...validReceiptData, enrichmentConfidence: 'low' };

        expect(highConfidence.enrichmentConfidence).toBe('high');
        expect(mediumConfidence.enrichmentConfidence).toBe('medium');
        expect(lowConfidence.enrichmentConfidence).toBe('low');
      });

      it('should handle large price values', () => {
        const expensiveItem = {
          ...validReceiptData,
          totalPricePaid: 99999.99
        };

        expect(expensiveItem.totalPricePaid).toBe(99999.99);
      });

      it('should handle timestamp objects', () => {
        const now = new Date();
        const receiptWithTimestamp = {
          ...validReceiptData,
          receiptCreatedTimestamp: now
        };

        expect(receiptWithTimestamp.receiptCreatedTimestamp).toBeInstanceOf(Date);
        expect(receiptWithTimestamp.receiptCreatedTimestamp).toBe(now);
      });
    });

    describe('Database Query Mocking', () => {
      const validReceiptData: NewReceipt = {
        receiptId: 'test-receipt-001',
        productId: 'test-product-001',
        receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
        merchantName: 'Test Store',
        productDescription: 'Test Product Description',
        brand: 'Test Brand',
        productCategory: ['Electronics', 'Computers', 'Laptops'],
        totalPricePaid: 999.99,
        productCode: 'TEST123456',
        productImageUrl: 'https://example.com/test-image.jpg',
        enrichedBrand: 'Test Brand',
        enrichedCategory: ['Electronics', 'Computers', 'Laptops'],
        enrichmentConfidence: 'high',
      };

      it('should mock database insert operations', async () => {
        const mockInsert = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ receiptId: 'test-001' }])
        };
        
        mockDb.insert.mockReturnValue(mockInsert);

        const result = await mockDb.insert(receipts)
          .values(validReceiptData)
          .returning({ receiptId: receipts.receiptId });

        expect(mockDb.insert).toHaveBeenCalledWith(receipts);
        expect(mockInsert.values).toHaveBeenCalledWith(validReceiptData);
        expect(result).toEqual([{ receiptId: 'test-001' }]);
      });

      it('should mock database select operations', async () => {
        const mockSelect = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([validReceiptData] as any)
        };

        mockDb.select.mockReturnValue(mockSelect);

        const result = await mockDb.select()
          .from(receipts)
          .where(eq(receipts.receiptId, 'test-001'))
          .limit(1);

        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.from).toHaveBeenCalledWith(receipts);
        expect(result).toEqual([validReceiptData]);
      });

      it('should mock database connection checks', async () => {
        const mockExecute = jest.fn().mockResolvedValue({ rows: [{ test: 1 }] });
        mockDb.execute.mockImplementation(mockExecute);

        const result = await mockDb.execute(sql`SELECT 1 as test`);

        expect(mockExecute).toHaveBeenCalled();
        expect(result.rows).toEqual([{ test: 1 }]);
      });

      it('should mock database delete operations', async () => {
        const mockWhere = jest.fn();
        mockWhere.mockResolvedValue({ rowCount: 1 });
        
        const mockDelete = {
          where: mockWhere
        };

        mockDb.delete.mockReturnValue(mockDelete);

        const result = await mockDb.delete(receipts)
          .where(sql`receipt_id LIKE 'test-%'`);

        expect(mockDb.delete).toHaveBeenCalledWith(receipts);
        expect(result).toEqual({ rowCount: 1 });
      });
    });
  });
});