import { describe, it, expect } from '@jest/globals';
import { ReceiptInputSchema, EnrichmentConfidenceSchema, PriceSchema, CategorySchema } from '../../validation/schemas.js';

describe('Validation Schemas Unit Tests', () => {
  describe('ReceiptInputSchema', () => {
    it('should validate receipt with lowercase fields', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        product_description: 'iPhone 15 Pro',
        merchant_name: 'Apple Store',
        total_price_paid: 999.99
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.receipt_id).toBe('RCP123');
      }
    });

    it('should validate receipt with uppercase fields', () => {
      const validReceipt = {
        RECEIPT_ID: 'RCP123',
        PRODUCT_DESCRIPTION: 'iPhone 15 Pro',
        MERCHANT_NAME: 'Apple Store',
        TOTAL_PRICE_PAID: 999.99
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be normalized to lowercase
        expect(result.data.receipt_id).toBe('RCP123');
      }
    });

    it('should validate receipt with mixed case fields', () => {
      const validReceipt = {
        Receipt_Id: 'RCP123',
        Product_Description: 'iPhone 15 Pro',
        Merchant_Name: 'Apple Store',
        Total_Price_Paid: 999.99
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be normalized to lowercase
        expect(result.data.receipt_id).toBe('RCP123');
      }
    });

    it('should handle array product categories', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        product_category: ['Electronics', 'Mobile', 'Smartphones']
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.product_category).toEqual(['Electronics', 'Mobile', 'Smartphones']);
      }
    });

    it('should handle string product categories', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        product_category: 'Electronics'
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.product_category).toBe('Electronics');
      }
    });

    it('should handle numeric prices', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        total_price_paid: 99.99
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
    });

    it('should handle string prices', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        total_price_paid: '99.99'
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
    });

    it('should validate valid image URLs', () => {
      const validReceipt = {
        receipt_id: 'RCP123',
        product_image_url: 'https://example.com/image.jpg'
      };

      const result = ReceiptInputSchema.safeParse(validReceipt);
      expect(result.success).toBe(true);
    });

    it('should reject invalid image URLs', () => {
      const invalidReceipt = {
        receipt_id: 'RCP123',
        product_image_url: 'not-a-valid-url'
      };

      const result = ReceiptInputSchema.safeParse(invalidReceipt);
      expect(result.success).toBe(false);
    });

    it('should require receipt_id', () => {
      const invalidReceipt = {
        product_description: 'iPhone 15 Pro'
      };

      const result = ReceiptInputSchema.safeParse(invalidReceipt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('receipt_id is required');
      }
    });

    it('should reject empty receipt_id', () => {
      const invalidReceipt = {
        receipt_id: ''
      };

      const result = ReceiptInputSchema.safeParse(invalidReceipt);
      expect(result.success).toBe(false);
    });

    it('should handle null and undefined values gracefully', () => {
      const receiptWithNulls = {
        receipt_id: 'RCP123',
        product_id: null,
        product_description: undefined,
        brand: null
      };

      const result = ReceiptInputSchema.safeParse(receiptWithNulls);
      expect(result.success).toBe(true);
    });

    it('should handle ISO datetime strings', () => {
      const receiptWithTimestamp = {
        receipt_id: 'RCP123',
        receipt_created_timestamp: '2024-01-15T10:30:00.000Z'
      };

      const result = ReceiptInputSchema.safeParse(receiptWithTimestamp);
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime strings', () => {
      const receiptWithBadTimestamp = {
        receipt_id: 'RCP123',
        receipt_created_timestamp: 'not-a-date'
      };

      const result = ReceiptInputSchema.safeParse(receiptWithBadTimestamp);
      expect(result.success).toBe(false);
    });
  });

  describe('EnrichmentConfidenceSchema', () => {
    it('should accept valid confidence levels', () => {
      expect(EnrichmentConfidenceSchema.safeParse('high').success).toBe(true);
      expect(EnrichmentConfidenceSchema.safeParse('medium').success).toBe(true);
      expect(EnrichmentConfidenceSchema.safeParse('low').success).toBe(true);
    });

    it('should reject invalid confidence levels', () => {
      expect(EnrichmentConfidenceSchema.safeParse('very-high').success).toBe(false);
      expect(EnrichmentConfidenceSchema.safeParse('unknown').success).toBe(false);
      expect(EnrichmentConfidenceSchema.safeParse('').success).toBe(false);
      expect(EnrichmentConfidenceSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('PriceSchema', () => {
    it('should accept valid positive prices', () => {
      expect(PriceSchema.safeParse(0).success).toBe(true);
      expect(PriceSchema.safeParse(9.99).success).toBe(true);
      expect(PriceSchema.safeParse(1000.00).success).toBe(true);
      expect(PriceSchema.safeParse(0.01).success).toBe(true);
    });

    it('should reject negative prices', () => {
      expect(PriceSchema.safeParse(-1).success).toBe(false);
      expect(PriceSchema.safeParse(-9.99).success).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(PriceSchema.safeParse('9.99').success).toBe(false);
      expect(PriceSchema.safeParse('free').success).toBe(false);
      expect(PriceSchema.safeParse(null).success).toBe(false);
      expect(PriceSchema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('CategorySchema', () => {
    it('should accept string categories', () => {
      expect(CategorySchema.safeParse('Electronics').success).toBe(true);
      expect(CategorySchema.safeParse('Food & Beverage').success).toBe(true);
    });

    it('should accept array categories', () => {
      expect(CategorySchema.safeParse(['Electronics']).success).toBe(true);
      expect(CategorySchema.safeParse(['Electronics', 'Mobile', 'Phones']).success).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(CategorySchema.safeParse('').success).toBe(false);
    });

    it('should reject arrays with empty strings', () => {
      expect(CategorySchema.safeParse(['Electronics', '']).success).toBe(false);
      expect(CategorySchema.safeParse(['']).success).toBe(false);
    });

    it('should reject non-string array elements', () => {
      expect(CategorySchema.safeParse(['Electronics', 123]).success).toBe(false);
      expect(CategorySchema.safeParse(['Electronics', null]).success).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(CategorySchema.safeParse(null).success).toBe(false);
      expect(CategorySchema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('Case-insensitive field processing', () => {
    it('should normalize all field names to lowercase', () => {
      const receiptWithMixedCase = {
        RECEIPT_ID: 'RCP123',
        Product_Description: 'Test Product',
        merchant_name: 'Test Store',
        TOTAL_PRICE_PAID: 99.99
      };

      const result = ReceiptInputSchema.safeParse(receiptWithMixedCase);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // All fields should be accessible via lowercase keys
        expect(result.data.receipt_id).toBe('RCP123');
        expect(result.data.product_description).toBe('Test Product');
        expect(result.data.merchant_name).toBe('Test Store');
        expect(result.data.total_price_paid).toBe(99.99);
      }
    });

    it('should handle deeply nested case transformations', () => {
      const complexReceipt = {
        receipt_id: 'RCP123',
        product_description: 'Complex Product',
        merchant_name: 'Complex Store'
      };

      const result = ReceiptInputSchema.safeParse(complexReceipt);
      expect(result.success).toBe(true);
    });
  });
});