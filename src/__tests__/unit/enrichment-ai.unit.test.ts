import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { enrichReceiptData } from '../../services/enrichment.js';

// Mock the AI module
jest.mock('../../ai/index.js', () => ({
  generateLLMText: jest.fn()
}));

describe('Enrichment AI Service Unit Tests', () => {
  const mockGenerateLLMText = jest.mocked(require('../../ai/index.js').generateLLMText);
  let consoleSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleSpy.mockRestore();
  });

  describe('enrichReceiptData', () => {
    const mockSuccessResponse = `{
      "brand": "Apple",
      "category": ["Electronics", "Mobile", "Smartphones"],
      "upc": "123456789012",
      "size": "6.1-inch",
      "color": "Space Gray",
      "material": "Aluminum",
      "model": "Pro",
      "weight": "7.27 oz",
      "confidence": "high"
    }`;

    it('should successfully enrich receipt data', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      const result = await enrichReceiptData(
        'iPhone 15 Pro 128GB Space Gray',
        'Apple Store',
        undefined,
        '123456789012'
      );

      expect(result).toEqual({
        brand: 'Apple',
        category: ['Electronics', 'Mobile', 'Smartphones'],
        upc: '123456789012',
        size: '6.1-inch',
        color: 'Space Gray',
        material: 'Aluminum',
        model: 'Pro',
        weight: '7.27 oz',
        confidence: 'high'
      });

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('iPhone 15 Pro 128GB Space Gray'),
        {
          temperature: 0.1,
          maxTokens: 400,
          model: 'gpt-4o-mini'
        }
      );
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const markdownResponse = `\`\`\`json
      ${mockSuccessResponse}
      \`\`\``;
      
      mockGenerateLLMText.mockResolvedValue(markdownResponse);

      const result = await enrichReceiptData('iPhone 15 Pro', 'Apple Store');

      expect(result.brand).toBe('Apple');
      expect(result.confidence).toBe('high');
    });

    it('should handle existing brand information', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      const result = await enrichReceiptData(
        'iPhone 15 Pro',
        'Apple Store',
        'Apple Inc.',
        '123456789012'
      );

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('Existing Brand: "Apple Inc."'),
        expect.any(Object)
      );
      expect(result.brand).toBe('Apple');
    });

    it('should pass product code to AI', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      await enrichReceiptData(
        'iPhone 15 Pro',
        'Apple Store',
        undefined,
        '987654321098'
      );

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('Existing Product Code: "987654321098"'),
        expect.any(Object)
      );
    });

    it('should handle AI service errors gracefully', async () => {
      mockGenerateLLMText.mockRejectedValue(new Error('AI service unavailable'));

      const result = await enrichReceiptData(
        'iPhone 15 Pro',
        'Apple Store',
        'Apple'
      );

      expect(result).toEqual({
        brand: 'Apple',
        category: ['unknown'],
        upc: null,
        size: null,
        color: null,
        material: null,
        model: null,
        weight: null,
        confidence: 'low'
      });
    });

    it('should handle invalid JSON responses', async () => {
      mockGenerateLLMText.mockResolvedValue('This is not valid JSON');

      const result = await enrichReceiptData(
        'iPhone 15 Pro',
        'Apple Store',
        'Apple'
      );

      expect(result).toEqual({
        brand: 'Apple',
        category: ['unknown'],
        upc: null,
        size: null,
        color: null,
        material: null,
        model: null,
        weight: null,
        confidence: 'low'
      });
    });

    it('should handle incomplete AI responses', async () => {
      const incompleteResponse = `{
        "brand": "Apple",
        "category": ["Electronics"],
        "upc": null,
        "size": null,
        "color": null,
        "material": null,
        "model": null,
        "weight": null,
        "confidence": "medium"
      }`;
      
      mockGenerateLLMText.mockResolvedValue(incompleteResponse);

      const result = await enrichReceiptData('iPhone 15 Pro', 'Apple Store');

      expect(result.brand).toBe('Apple');
      expect(result.category).toEqual(['Electronics']);
      expect(result.confidence).toBe('medium');
      expect(result.upc).toBeNull();
      expect(result.size).toBeNull();
    });

    it('should validate AI response schema', async () => {
      const invalidResponse = `{
        "brand": "Apple",
        "category": "Electronics",
        "confidence": "invalid-confidence"
      }`;
      
      mockGenerateLLMText.mockResolvedValue(invalidResponse);

      const result = await enrichReceiptData(
        'iPhone 15 Pro',
        'Apple Store',
        'Apple'
      );

      // Should fall back to error handling
      expect(result.confidence).toBe('low');
      expect(result.brand).toBe('Apple');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle null values in AI response', async () => {
      const responseWithNulls = `{
        "brand": "Apple",
        "category": ["Electronics"],
        "upc": null,
        "size": null,
        "color": null,
        "material": null,
        "model": null,
        "weight": null,
        "confidence": "high"
      }`;
      
      mockGenerateLLMText.mockResolvedValue(responseWithNulls);

      const result = await enrichReceiptData('iPhone 15 Pro', 'Apple Store');

      expect(result.upc).toBeNull();
      expect(result.size).toBeNull();
      expect(result.color).toBeNull();
      expect(result.material).toBeNull();
      expect(result.model).toBeNull();
      expect(result.weight).toBeNull();
    });

    it('should use correct AI model and parameters', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      await enrichReceiptData('Test Product', 'Test Store');

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.any(String),
        {
          temperature: 0.1,
          maxTokens: 400,
          model: 'gpt-4o-mini'
        }
      );
    });

    it('should generate appropriate prompt content', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      await enrichReceiptData(
        'MacBook Pro 13-inch',
        'Apple Store',
        'Apple',
        'MBPRO13'
      );

      const promptCall = mockGenerateLLMText.mock.calls[0][0];
      expect(promptCall).toContain('MacBook Pro 13-inch');
      expect(promptCall).toContain('Apple Store');
      expect(promptCall).toContain('Apple');
      expect(promptCall).toContain('MBPRO13');
      expect(promptCall).toContain('UPC');
      expect(promptCall).toContain('size');
      expect(promptCall).toContain('color');
      expect(promptCall).toContain('material');
    });

    it('should handle missing optional parameters', async () => {
      mockGenerateLLMText.mockResolvedValue(mockSuccessResponse);

      const result = await enrichReceiptData('Basic Product', 'Basic Store');

      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('Existing Brand: "none"'),
        expect.any(Object)
      );
      expect(mockGenerateLLMText).toHaveBeenCalledWith(
        expect.stringContaining('Existing Product Code: "none"'),
        expect.any(Object)
      );
      expect(result.brand).toBe('Apple'); // From mock response
    });
  });
});