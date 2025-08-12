import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { enrichReceiptData, standardizeBrand } from '../services/enrichment.js';
import * as aiModule from '../ai/index.js';

// Mock the AI module
jest.mock('../ai/index.js');
const mockGenerateLLMText = jest.mocked(aiModule.generateLLMText);

describe('Enrichment Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('standardizeBrand function', () => {
    it('should handle empty or null brand', () => {
      expect(standardizeBrand('')).toBe('unknown');
      expect(standardizeBrand(null as any)).toBe('unknown');
      expect(standardizeBrand(undefined as any)).toBe('unknown');
    });

    it('should remove .com suffix', () => {
      expect(standardizeBrand('amazon.com')).toBe('Amazon');
      expect(standardizeBrand('walmart.com')).toBe('Walmart');
      expect(standardizeBrand('target.com')).toBe('Target');
    });

    it('should remove corporate suffixes', () => {
      expect(standardizeBrand('microsoft inc')).toBe('Microsoft');
      expect(standardizeBrand('google inc.')).toBe('Google');
      expect(standardizeBrand('apple llc')).toBe('Apple');
      expect(standardizeBrand('tesla corp')).toBe('Tesla');
      expect(standardizeBrand('walmart corp.')).toBe('Walmart');
    });

    it('should normalize capitalization', () => {
      expect(standardizeBrand('NIKE')).toBe('Nike');
      expect(standardizeBrand('adidas')).toBe('Adidas');
      expect(standardizeBrand('coca-cola')).toBe('Coca-cola');
    });

    it('should handle multiple words correctly', () => {
      expect(standardizeBrand('johnson & johnson')).toBe('Johnson & Johnson');
      expect(standardizeBrand('procter & gamble')).toBe('Procter & Gamble');
      expect(standardizeBrand('general electric')).toBe('General Electric');
    });

    it('should handle complex brand names', () => {
      expect(standardizeBrand('mcdonald\'s')).toBe('Mcdonald\'s');
      expect(standardizeBrand('t-mobile')).toBe('T-mobile');
      expect(standardizeBrand('7-eleven')).toBe('7-eleven');
    });

    it('should trim whitespace', () => {
      expect(standardizeBrand('  apple  ')).toBe('Apple');
      expect(standardizeBrand('\n\tgoogle\n\t')).toBe('Google');
    });

    it('should handle multiple suffixes in order', () => {
      // Suffixes are processed in order: .com first (if at end), then inc/llc/corp (if at end)
      expect(standardizeBrand('amazon inc.com')).toBe('Amazon'); // .com removed first, then inc
      expect(standardizeBrand('amazon.com inc')).toBe('Amazon.com'); // inc removed, .com not at end anymore
      expect(standardizeBrand('microsoft corp.com')).toBe('Microsoft'); // .com removed first, then corp
    });
  });

  describe('enrichReceiptData function', () => {
    let consoleSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    const mockValidResponse = JSON.stringify({
      brand: 'Apple',
      category: ['Electronics', 'Mobile Phones', 'Smartphones'],
      confidence: 'high'
    });

    it('should successfully enrich receipt data with valid AI response', async () => {
      mockGenerateLLMText.mockResolvedValue(mockValidResponse);

      const result = await enrichReceiptData(
        'iPhone 15 Pro Max 256GB Natural Titanium',
        'Apple Store',
        'Apple'
      );

      expect(result).toEqual({
        brand: 'Apple',
        category: ['Electronics', 'Mobile Phones', 'Smartphones'],
        confidence: 'high'
      });

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('iPhone 15 Pro Max 256GB Natural Titanium'),
        {
          temperature: 0.1,
          maxTokens: 200,
          model: 'gpt-4o-mini'
        }
      );
    });

    it('should handle AI response wrapped in markdown code blocks', async () => {
      const wrappedResponse = '```json\n' + mockValidResponse + '\n```';
      mockGenerateLLMText.mockResolvedValue(wrappedResponse);

      const result = await enrichReceiptData(
        'Samsung Galaxy S24 Ultra',
        'Best Buy',
        'Samsung'
      );

      expect(result.brand).toBe('Apple');
      expect(result.category).toEqual(['Electronics', 'Mobile Phones', 'Smartphones']);
    });

    it('should handle AI response with just code block markers', async () => {
      const codeBlockResponse = '```\n' + mockValidResponse + '\n```';
      mockGenerateLLMText.mockResolvedValue(codeBlockResponse);

      const result = await enrichReceiptData(
        'MacBook Pro 16 inch',
        'Apple Store'
      );

      expect(result.brand).toBe('Apple');
      expect(result.confidence).toBe('high');
    });

    it('should fallback to unknown values when AI service fails', async () => {
      mockGenerateLLMText.mockRejectedValue(new Error('AI service unavailable'));

      const result = await enrichReceiptData(
        'Unknown Product',
        'Unknown Store',
        'Known Brand'
      );

      expect(result).toEqual({
        brand: 'Known Brand',
        category: ['unknown'],
        confidence: 'low'
      });
    });

    it('should fallback when AI returns invalid JSON', async () => {
      mockGenerateLLMText.mockResolvedValue('invalid json response');

      const result = await enrichReceiptData(
        'Test Product',
        'Test Store'
      );

      expect(result).toEqual({
        brand: 'unknown',
        category: ['unknown'],
        confidence: 'low'
      });
    });

    it('should fallback when AI response fails validation', async () => {
      const invalidResponse = JSON.stringify({
        brand: 123, // Should be string
        category: 'not-an-array', // Should be array
        confidence: 'invalid' // Should be enum value
      });
      mockGenerateLLMText.mockResolvedValue(invalidResponse);

      const result = await enrichReceiptData(
        'Test Product',
        'Test Store',
        'Fallback Brand'
      );

      expect(result).toEqual({
        brand: 'Fallback Brand',
        category: ['unknown'],
        confidence: 'low'
      });
    });

    it('should include all required fields in prompt', async () => {
      mockGenerateLLMText.mockResolvedValue(mockValidResponse);

      await enrichReceiptData(
        'Nintendo Switch OLED Console',
        'GameStop',
        'Nintendo'
      );

      const callArgs = mockGenerateLLMText.mock.calls[0];
      const prompt = callArgs[0];

      expect(prompt).toContain('Nintendo Switch OLED Console');
      expect(prompt).toContain('GameStop');
      expect(prompt).toContain('Nintendo');
      expect(prompt).toContain('JSON format');
    });

    it('should handle missing existing brand gracefully', async () => {
      mockGenerateLLMText.mockResolvedValue(mockValidResponse);

      await enrichReceiptData(
        'Generic Product Description',
        'Generic Store'
      );

      const callArgs = mockGenerateLLMText.mock.calls[0];
      const prompt = callArgs[0];

      expect(prompt).toContain('Existing Brand: "none"');
    });

    it('should handle edge cases with special characters', async () => {
      const specialCharResponse = JSON.stringify({
        brand: 'L\'Oréal',
        category: ['Beauty & Personal Care', 'Cosmetics'],
        confidence: 'medium'
      });
      mockGenerateLLMText.mockResolvedValue(specialCharResponse);

      const result = await enrichReceiptData(
        'L\'Oréal Paris Voluminous Mascara',
        'CVS Pharmacy',
        'L\'Oréal'
      );

      expect(result.brand).toBe('L\'Oréal');
      expect(result.category).toEqual(['Beauty & Personal Care', 'Cosmetics']);
    });

    it('should handle unicode characters in response', async () => {
      const unicodeResponse = JSON.stringify({
        brand: 'Häagen-Dazs',
        category: ['Food & Grocery', 'Frozen Foods', 'Ice Cream'],
        confidence: 'high'
      });
      mockGenerateLLMText.mockResolvedValue(unicodeResponse);

      const result = await enrichReceiptData(
        'Häagen-Dazs Vanilla Ice Cream',
        'Whole Foods',
        'Häagen-Dazs'
      );

      expect(result.brand).toBe('Häagen-Dazs');
    });

    it('should handle long product descriptions', async () => {
      mockGenerateLLMText.mockResolvedValue(mockValidResponse);

      const longDescription = 'A'.repeat(1000) + ' very long product description';
      
      await enrichReceiptData(
        longDescription,
        'Test Store',
        'Test Brand'
      );

      expect(mockGenerateLLMText).toHaveBeenCalled();
      
      const callArgs = mockGenerateLLMText.mock.calls[0];
      const prompt = callArgs[0];
      
      expect(prompt).toContain(longDescription);
    });

    it('should use correct AI model parameters', async () => {
      mockGenerateLLMText.mockResolvedValue(mockValidResponse);

      await enrichReceiptData(
        'Test Product',
        'Test Store',
        'Test Brand'
      );

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.any(String),
        {
          temperature: 0.1,
          maxTokens: 200,
          model: 'gpt-4o-mini'
        }
      );
    });

    it('should handle network timeouts gracefully', async () => {
      mockGenerateLLMText.mockRejectedValue(new Error('Request timeout'));

      const result = await enrichReceiptData(
        'Timeout Test Product',
        'Timeout Store',
        'Timeout Brand'
      );

      expect(result).toEqual({
        brand: 'Timeout Brand',
        category: ['unknown'],
        confidence: 'low'
      });
    });
  });
});