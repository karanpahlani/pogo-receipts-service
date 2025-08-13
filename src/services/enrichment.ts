import { generateLLMText } from '../ai/index.js';
import { z } from 'zod';

// Zod schema for structured AI output
const EnrichmentSchema = z.object({
  brand: z.string(),
  category: z.array(z.string()),
  upc: z.string().nullable(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  material: z.string().nullable(),
  model: z.string().nullable(),
  weight: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low'])
});

export type EnrichmentResult = z.infer<typeof EnrichmentSchema>;

export async function enrichReceiptData(
  productDescription: string,
  merchantName: string,
  existingBrand?: string,
  existingProductCode?: string
): Promise<EnrichmentResult> {
  try {
    const prompt = `
Analyze this product information and extract/standardize all available product details:

Product Description: "${productDescription}"
Merchant: "${merchantName}"
Existing Brand: "${existingBrand || 'none'}"
Existing Product Code: "${existingProductCode || 'none'}"

Please extract and provide:
1. Brand name (standardized, e.g., "Amazon.com" → "Amazon")
2. Product category hierarchy (3 levels max, e.g., ["Electronics", "Audio", "Headphones"])
3. UPC code (12-digit Universal Product Code if identifiable)
4. Size (e.g., "13-inch", "Large", "64GB", "500ml")
5. Color (e.g., "Space Gray", "Red", "Blue")
6. Material (e.g., "Cotton", "Aluminum", "Plastic")
7. Model (e.g., "Pro Max", "Air", "SE")
8. Weight (e.g., "1.5 lbs", "200g")
9. Confidence level (high/medium/low)

Rules:
- If you can't confidently determine a field, use "unknown" for strings or null for optional fields
- Standardize brand names (remove .com, normalize capitalization)
- Categories should be general → specific
- UPC should be 12 digits (validate if existing product code looks like UPC)
- Size should include units when relevant (GB, inches, oz, etc.)
- Color should be the primary/dominant color
- Be conservative with confidence ratings
- Use "unknown" rather than guessing

UPC Validation:
- UPC-A: 12 digits (most common)
- If existing product code is 12 digits and follows UPC format, use it
- Otherwise try to identify UPC from product description or return null

Respond in JSON format:
{
  "brand": "string",
  "category": ["level1", "level2", "level3"],
  "upc": "123456789012" or null,
  "size": "string" or null,
  "color": "string" or null,
  "material": "string" or null,
  "model": "string" or null,
  "weight": "string" or null,
  "confidence": "high|medium|low"
}`;

    const response = await generateLLMText(prompt, {
      temperature: 0.1,
      maxTokens: 400,
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
      upc: null,
      size: null,
      color: null,
      material: null,
      model: null,
      weight: null,
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