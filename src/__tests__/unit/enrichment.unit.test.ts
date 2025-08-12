import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { standardizeBrand, parseProductCategory, normalizeMerchantName } from '../../services/enrichment.js';

// Mock the AI module to avoid network calls
jest.mock('../../ai/index.js', () => ({
  generateLLMText: jest.fn()
}));

describe('Enrichment Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('standardizeBrand', () => {
    it('should standardize common brand variations', () => {
      expect(standardizeBrand('apple')).toBe('Apple');
      expect(standardizeBrand('APPLE')).toBe('Apple');
      expect(standardizeBrand('Apple Inc.')).toBe('Apple');
      expect(standardizeBrand('apple inc')).toBe('Apple');
    });

    it('should standardize Amazon variations', () => {
      expect(standardizeBrand('amazon')).toBe('Amazon');
      expect(standardizeBrand('AMAZON.COM')).toBe('Amazon');
      expect(standardizeBrand('Amazon.com')).toBe('Amazon');
      expect(standardizeBrand('amazon inc')).toBe('Amazon');
    });

    it('should standardize Google variations', () => {
      expect(standardizeBrand('google')).toBe('Google');
      expect(standardizeBrand('GOOGLE LLC')).toBe('Google');
      expect(standardizeBrand('Google Inc.')).toBe('Google');
      expect(standardizeBrand('google llc')).toBe('Google');
    });

    it('should standardize Microsoft variations', () => {
      expect(standardizeBrand('microsoft')).toBe('Microsoft');
      expect(standardizeBrand('MICROSOFT CORP')).toBe('Microsoft');
      expect(standardizeBrand('Microsoft Corporation')).toBe('Microsoft');
      expect(standardizeBrand('microsoft corp')).toBe('Microsoft');
    });

    it('should handle unknown brands by title casing', () => {
      expect(standardizeBrand('unknown brand')).toBe('Unknown Brand');
      expect(standardizeBrand('UNKNOWN BRAND')).toBe('Unknown Brand');
      expect(standardizeBrand('unknownBrand')).toBe('Unknownbrand');
    });

    it('should handle null and undefined', () => {
      expect(standardizeBrand(null)).toBeNull();
      expect(standardizeBrand(undefined)).toBeNull();
      expect(standardizeBrand('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(standardizeBrand('  Apple  ')).toBe('Apple');
      expect(standardizeBrand('\\t\\nGoogle\\t\\n')).toBe('Google');
    });

    it('should handle special characters', () => {
      expect(standardizeBrand('Coca-Cola')).toBe('Coca-Cola');
      expect(standardizeBrand('AT&T')).toBe('At&T');
      expect(standardizeBrand('H&M')).toBe('H&M');
    });
  });

  describe('parseProductCategory', () => {
    it('should parse JSON string arrays', () => {
      const category = '["Electronics", "Computers", "Laptops"]';
      expect(parseProductCategory(category)).toEqual(['Electronics', 'Computers', 'Laptops']);
    });

    it('should handle already parsed arrays', () => {
      const category = ['Electronics', 'Computers', 'Laptops'];
      expect(parseProductCategory(category)).toEqual(['Electronics', 'Computers', 'Laptops']);
    });

    it('should handle single string categories', () => {
      expect(parseProductCategory('Electronics')).toBe('Electronics');
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '["Electronics", "Computers"';
      expect(parseProductCategory(malformedJson)).toBe(malformedJson);
    });

    it('should handle null and undefined', () => {
      expect(parseProductCategory(null)).toBeNull();
      expect(parseProductCategory(undefined)).toBeNull();
    });

    it('should handle empty strings', () => {
      expect(parseProductCategory('')).toBe('');
    });

    it('should handle nested arrays in JSON', () => {
      const category = '["Electronics", ["Computers", "Laptops"]]';
      expect(parseProductCategory(category)).toEqual(['Electronics', ['Computers', 'Laptops']]);
    });

    it('should handle arrays with mixed types', () => {
      const category = ['Electronics', 123, 'Computers'];
      expect(parseProductCategory(category)).toEqual(['Electronics', 123, 'Computers']);
    });
  });

  describe('normalizeMerchantName', () => {
    it('should normalize common merchant names', () => {
      expect(normalizeMerchantName('walmart')).toBe('Walmart');
      expect(normalizeMerchantName('WALMART')).toBe('Walmart');
      expect(normalizeMerchantName('Wal-Mart')).toBe('Walmart');
      expect(normalizeMerchantName('wal-mart')).toBe('Walmart');
    });

    it('should normalize Target variations', () => {
      expect(normalizeMerchantName('target')).toBe('Target');
      expect(normalizeMerchantName('TARGET CORP')).toBe('Target');
      expect(normalizeMerchantName('Target Corporation')).toBe('Target');
    });

    it('should normalize Amazon variations', () => {
      expect(normalizeMerchantName('amazon')).toBe('Amazon');
      expect(normalizeMerchantName('AMAZON.COM')).toBe('Amazon');
      expect(normalizeMerchantName('Amazon.com')).toBe('Amazon');
      expect(normalizeMerchantName('amazon marketplace')).toBe('Amazon');
    });

    it('should handle unknown merchants by title casing', () => {
      expect(normalizeMerchantName('local grocery store')).toBe('Local Grocery Store');
      expect(normalizeMerchantName('UNKNOWN MERCHANT')).toBe('Unknown Merchant');
    });

    it('should handle null and undefined', () => {
      expect(normalizeMerchantName(null)).toBeNull();
      expect(normalizeMerchantName(undefined)).toBeNull();
      expect(normalizeMerchantName('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normalizeMerchantName('  Walmart  ')).toBe('Walmart');
      expect(normalizeMerchantName('\\t\\nTarget\\t\\n')).toBe('Target');
    });

    it('should handle store numbers and locations', () => {
      expect(normalizeMerchantName('Walmart Store #1234')).toBe('Walmart');
      expect(normalizeMerchantName('Target - Store 5678')).toBe('Target');
      expect(normalizeMerchantName('Amazon Fulfillment Center')).toBe('Amazon');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long brand names', () => {
      const longBrand = 'A'.repeat(1000);
      expect(standardizeBrand(longBrand)).toBe(longBrand);
    });

    it('should handle special Unicode characters', () => {
      expect(standardizeBrand('Pokémon')).toBe('Pokémon');
      expect(standardizeBrand('Häagen-Dazs')).toBe('Häagen-Dazs');
      expect(standardizeBrand('北京')).toBe('北京');
    });

    it('should handle numbers in brand names', () => {
      expect(standardizeBrand('3M')).toBe('3M');
      expect(standardizeBrand('7-Eleven')).toBe('7-Eleven');
      expect(standardizeBrand('24/7')).toBe('24/7');
    });

    it('should handle category arrays with empty strings', () => {
      const category = ['Electronics', '', 'Computers'];
      expect(parseProductCategory(category)).toEqual(['Electronics', '', 'Computers']);
    });

    it('should handle deeply nested JSON structures', () => {
      const category = '{"level1": {"level2": ["Electronics", "Computers"]}}';
      expect(parseProductCategory(category)).toEqual({
        level1: { level2: ['Electronics', 'Computers'] }
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `Category${i}`);
      const result = parseProductCategory(largeArray);
      expect(result).toEqual(largeArray);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not mutate input arrays', () => {
      const originalArray = ['Electronics', 'Computers'];
      const result = parseProductCategory(originalArray);
      expect(result).toEqual(originalArray);
      expect(result).not.toBe(originalArray); // Should be a different reference
    });

    it('should handle concurrent calls without interference', () => {
      const brand1 = 'apple';
      const brand2 = 'google';
      const brand3 = 'microsoft';

      const result1 = standardizeBrand(brand1);
      const result2 = standardizeBrand(brand2);
      const result3 = standardizeBrand(brand3);

      expect(result1).toBe('Apple');
      expect(result2).toBe('Google');
      expect(result3).toBe('Microsoft');
    });
  });
});