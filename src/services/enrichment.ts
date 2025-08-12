import { generateLLMText } from '../ai/index.js';
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

export function standardizeBrand(brand: string | null | undefined): string | null {
  if (!brand) return brand === null ? null : (brand === undefined ? null : '');
  
  const trimmed = brand.trim();
  if (!trimmed) return trimmed;
  
  const normalized = trimmed.toLowerCase();
  
  // Common brand mappings
  const brandMappings: Record<string, string> = {
    'apple': 'Apple',
    'apple inc': 'Apple',
    'apple inc.': 'Apple',
    'amazon': 'Amazon',
    'amazon.com': 'Amazon',
    'amazon inc': 'Amazon',
    'google': 'Google',
    'google llc': 'Google',
    'google inc': 'Google',
    'google inc.': 'Google',
    'microsoft': 'Microsoft',
    'microsoft corp': 'Microsoft',
    'microsoft corporation': 'Microsoft',
  };
  
  // Check exact matches first
  if (brandMappings[normalized]) {
    return brandMappings[normalized];
  }
  
  // Basic standardization rules for unknown brands
  return normalized
    .replace(/\.com$/, '')
    .replace(/\binc\.?$/i, '')
    .replace(/\bllc\.?$/i, '')
    .replace(/\bcorp(oration)?\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseProductCategory(category: any): any {
  if (category === null || category === undefined) {
    return category;
  }
  
  if (Array.isArray(category)) {
    return [...category]; // Return a copy to avoid mutation
  }
  
  if (typeof category === 'string') {
    if (!category) return category;
    
    // Try to parse as JSON if it looks like an array
    if (category.trim().startsWith('[') || category.trim().startsWith('{')) {
      try {
        return JSON.parse(category);
      } catch (e) {
        // If parsing fails, return as string
        return category;
      }
    }
    return category;
  }
  
  return category;
}

export function normalizeMerchantName(merchantName: string | null | undefined): string | null {
  if (!merchantName) return merchantName === null ? null : (merchantName === undefined ? null : '');
  
  const trimmed = merchantName.trim();
  if (!trimmed) return trimmed;
  
  const normalized = trimmed.toLowerCase();
  
  // Common merchant mappings
  const merchantMappings: Record<string, string> = {
    'walmart': 'Walmart',
    'wal-mart': 'Walmart',
    'target': 'Target',
    'target corp': 'Target',
    'target corporation': 'Target',
    'amazon': 'Amazon',
    'amazon.com': 'Amazon',
    'amazon marketplace': 'Amazon',
    'amazon fulfillment center': 'Amazon',
  };
  
  // Check for exact matches
  if (merchantMappings[normalized]) {
    return merchantMappings[normalized];
  }
  
  // Check for partial matches (store numbers, locations)
  for (const [key, value] of Object.entries(merchantMappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // Default to title case for unknown merchants
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}