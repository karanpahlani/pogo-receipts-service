import { z } from 'zod';

// Helper function to create case-insensitive field validation
const caseInsensitiveField = <T extends z.ZodTypeAny>(schema: T) => 
  z.preprocess((val: any) => {
    if (typeof val === 'object' && val !== null) {
      // Transform keys to lowercase for consistent processing
      const transformed: any = {};
      for (const [key, value] of Object.entries(val)) {
        transformed[key.toLowerCase()] = value;
      }
      return transformed;
    }
    return val;
  }, schema);

// Base schema with consistent lowercase fields
const BaseReceiptSchema = z.object({
  receipt_id: z.string().min(1, 'Receipt ID is required').optional(),
  product_id: z.string().optional().nullable(),
  receipt_created_timestamp: z.string().datetime().optional().nullable(),
  merchant_name: z.string().optional().nullable(),
  product_description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  product_category: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  total_price_paid: z.union([z.string(), z.number()]).optional().nullable(),
  product_code: z.string().optional().nullable(),
  product_image_url: z.string().url().optional().nullable(),
}).refine(
  (data) => data.receipt_id,
  {
    message: "receipt_id is required",
    path: ["receipt_id"]
  }
);

// Receipt input validation schema with case-insensitive processing
export const ReceiptInputSchema = caseInsensitiveField(BaseReceiptSchema);

// Enrichment confidence validation
export const EnrichmentConfidenceSchema = z.enum(['high', 'medium', 'low']);

// Price validation
export const PriceSchema = z.number().min(0, 'Price must be non-negative');

// Category validation
export const CategorySchema = z.union([
  z.array(z.string().min(1)),
  z.string().min(1)
]);

export type ReceiptInput = z.infer<typeof ReceiptInputSchema>;
export type EnrichmentConfidence = z.infer<typeof EnrichmentConfidenceSchema>;