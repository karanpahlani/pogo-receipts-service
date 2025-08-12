import { generateLLMText } from '../ai';
import { z } from 'zod';

// Zod schema for structured AI output
const EnrichmentSchema = z.object({
  brand: z.string(),
  category: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low'])
});

export type EnrichmentResult = z.infer<typeof EnrichmentSchema>;

export async function enrichReceiptData(
  productDescription: string,
  merchantName: string,
  existingBrand?: string
): Promise<EnrichmentResult> {
  try {
    const prompt = `
Analyze this product information and extract/standardize the brand and category:

Product Description: "${productDescription}"
Merchant: "${merchantName}"
Existing Brand: "${existingBrand || 'none'}"

Please provide:
1. Brand name (standardized, e.g., "Amazon.com" → "Amazon")
2. Product category hierarchy (3 levels max, e.g., ["Electronics", "Audio", "Headphones"])
3. Confidence level (high/medium/low)

Rules:
- If you can't confidently determine brand/category, use "unknown"
- Standardize brand names (remove .com, normalize capitalization)
- Categories should be general → specific
- Be conservative with confidence ratings

Respond in JSON format:
{
  "brand": "string",
  "category": ["level1", "level2", "level3"],
  "confidence": "high|medium|low"
}`;

    const response = await generateLLMText(prompt, {
      temperature: 0.1,
      maxTokens: 200,
      model: 'gpt-4o-mini'
    });

    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonString);
    const result = EnrichmentSchema.parse(parsed);
    
    return result;
  } catch (error) {
    console.error('Error enriching receipt data:', error);
    return {
      brand: existingBrand || 'unknown',
      category: ['unknown'],
      confidence: 'low'
    };
  }
}

export function standardizeBrand(brand: string): string {
  if (!brand) return 'unknown';
  
  // Basic brand standardization rules
  return brand
    .toLowerCase()
    .replace(/\.com$/, '')
    .replace(/\binc\.?$/i, '')
    .replace(/\bllc\.?$/i, '')
    .replace(/\bcorp\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}