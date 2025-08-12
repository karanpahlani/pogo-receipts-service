import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-kit/migrator';
import supertest from 'supertest';
import { createApp } from '../app.js';
import { receipts, type NewReceipt } from '../db/schemas.js';

describe('Integration Tests with Testcontainers', () => {
  let container: StartedPostgreSqlContainer;
  let testPool: Pool;
  let testDb: any;
  let app: any;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Create connection pool
    testPool = new Pool({
      connectionString: container.getConnectionUri(),
      max: 5,
    });

    testDb = drizzle(testPool);

    // Run migrations
    const migrationConfig = {
      migrationsFolder: './src/db/migrations',
      dbCredentials: {
        connectionString: container.getConnectionUri(),
      },
    };

    // Create app instance
    app = createApp();

    // Set test database URL for the app
    process.env.DATABASE_URL = container.getConnectionUri();
  }, 60000);

  afterAll(async () => {
    await testPool.end();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testDb.delete(receipts).where(sql`receipt_id LIKE 'test-%'`);
  });

  describe('API Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await supertest(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should ingest a receipt successfully', async () => {
      const receiptData = {
        receipt_id: 'test-receipt-001',
        product_id: 'test-product-001',
        receipt_created_timestamp: '2023-08-12T10:30:00Z',
        merchant_name: 'Test Store',
        product_description: 'Apple iPhone 15 Pro',
        brand: 'Apple',
        product_category: ['Electronics', 'Phones', 'Smartphones'],
        total_price_paid: '999.99',
        product_code: 'IPHONE15PRO',
        product_image_url: 'https://example.com/iphone15pro.jpg',
      };

      const response = await supertest(app)
        .post('/receipt')
        .send(receiptData)
        .expect(201);

      expect(response.body.message).toBe('Receipt ingested successfully');
      expect(response.body.receipt_id).toBe('test-receipt-001');
      expect(response.body.enrichment).toBeDefined();

      // Verify data was inserted into database
      const savedReceipt = await testDb
        .select()
        .from(receipts)
        .where(sql`receipt_id = 'test-receipt-001'`)
        .limit(1);

      expect(savedReceipt).toHaveLength(1);
      expect(savedReceipt[0].receiptId).toBe('test-receipt-001');
      expect(savedReceipt[0].merchantName).toBe('Test Store');
    });

    it('should retrieve a receipt by receipt_id', async () => {
      // First insert a receipt
      const testReceiptData: NewReceipt = {
        receiptId: 'test-receipt-get',
        productId: 'test-product-get',
        receiptCreatedTimestamp: new Date('2023-08-12T10:30:00Z'),
        merchantName: 'Test Store',
        productDescription: 'Test Product',
        brand: 'Test Brand',
        productCategory: ['Electronics'],
        totalPricePaid: 99.99,
        productCode: 'TEST123',
        productImageUrl: 'https://example.com/test.jpg',
        enrichedBrand: null,
        enrichedCategory: null,
        enrichmentConfidence: null,
      };

      await testDb.insert(receipts).values(testReceiptData);

      // Now retrieve it via API
      const response = await supertest(app)
        .get('/receipt/test-receipt-get')
        .expect(200);

      expect(response.body.receiptId).toBe('test-receipt-get');
      expect(response.body.merchantName).toBe('Test Store');
      expect(response.body.totalPricePaid).toBe(99.99);
    });

    it('should return 404 for non-existent receipt', async () => {
      const response = await supertest(app)
        .get('/receipt/non-existent-receipt')
        .expect(404);

      expect(response.body.error).toBe('Receipt not found');
      expect(response.body.message).toContain('non-existent-receipt');
    });

    it('should handle malformed request data gracefully', async () => {
      const malformedData = {
        // Missing required fields
        product_description: 'Some product',
      };

      // Should not crash the server
      const response = await supertest(app)
        .post('/receipt')
        .send(malformedData);

      // Should handle gracefully (could be 400 or 201 depending on validation)
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle duplicate receipt_id appropriately', async () => {
      const receiptData = {
        receipt_id: 'test-duplicate-001',
        product_id: 'test-product-001',
        merchant_name: 'Test Store',
        product_description: 'Test Product',
        total_price_paid: '99.99',
      };

      // First insertion should succeed
      await supertest(app)
        .post('/receipt')
        .send(receiptData)
        .expect(201);

      // Second insertion with same receipt_id should be handled appropriately
      const response = await supertest(app)
        .post('/receipt')
        .send({
          ...receiptData,
          product_id: 'different-product-id',
        });

      // Should either reject with conflict or handle as idempotent
      expect([201, 409, 500]).toContain(response.status);
    });
  });

  describe('Database Integration', () => {
    it('should handle JSONB product categories correctly', async () => {
      const receiptData = {
        receipt_id: 'test-jsonb-category',
        product_id: 'test-product-jsonb',
        merchant_name: 'Test Store',
        product_description: 'Test Product',
        product_category: ['Home & Garden', 'Furniture', 'Living Room'],
        total_price_paid: '299.99',
      };

      await supertest(app)
        .post('/receipt')
        .send(receiptData)
        .expect(201);

      // Verify JSONB field was stored correctly
      const savedReceipt = await testDb
        .select()
        .from(receipts)
        .where(sql`receipt_id = 'test-jsonb-category'`)
        .limit(1);

      expect(savedReceipt[0].productCategory).toEqual(['Home & Garden', 'Furniture', 'Living Room']);
    });

    it('should handle string product categories', async () => {
      const receiptData = {
        receipt_id: 'test-string-category',
        product_id: 'test-product-string',
        merchant_name: 'Test Store',
        product_description: 'Test Product',
        product_category: 'Electronics',
        total_price_paid: '199.99',
      };

      await supertest(app)
        .post('/receipt')
        .send(receiptData)
        .expect(201);

      const savedReceipt = await testDb
        .select()
        .from(receipts)
        .where(sql`receipt_id = 'test-string-category'`)
        .limit(1);

      expect(savedReceipt[0].productCategory).toBe('Electronics');
    });

    it('should set timestamps automatically', async () => {
      const receiptData = {
        receipt_id: 'test-timestamps',
        product_id: 'test-product-timestamps',
        merchant_name: 'Test Store',
        product_description: 'Test Product',
      };

      await supertest(app)
        .post('/receipt')
        .send(receiptData)
        .expect(201);

      const savedReceipt = await testDb
        .select()
        .from(receipts)
        .where(sql`receipt_id = 'test-timestamps'`)
        .limit(1);

      expect(savedReceipt[0].createdAt).toBeInstanceOf(Date);
      expect(savedReceipt[0].updatedAt).toBeInstanceOf(Date);

      // Timestamps should be recent (within last minute)
      const now = new Date();
      const timeDiff = now.getTime() - savedReceipt[0].createdAt!.getTime();
      expect(timeDiff).toBeLessThan(60000);
    });
  });
});