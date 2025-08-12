import { z } from 'zod';

// Receipt input validation schema
export const ReceiptInputSchema = z.object({
  receipt_id: z.string().min(1, 'Receipt ID is required').optional(),
  RECEIPT_ID: z.string().min(1, 'Receipt ID is required').optional(),
  
  product_id: z.string().optional().nullable(),
  PRODUCT_ID: z.string().optional().nullable(),
  
  receipt_created_timestamp: z.string().datetime().optional().nullable(),
  RECEIPT_CREATED_TIMESTAMP: z.string().datetime().optional().nullable(),
  
  merchant_name: z.string().optional().nullable(),
  MERCHANT_NAME: z.string().optional().nullable(),
  
  product_description: z.string().optional().nullable(),
  PRODUCT_DESCRIPTION: z.string().optional().nullable(),
  
  brand: z.string().optional().nullable(),
  BRAND: z.string().optional().nullable(),
  
  product_category: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().nullable(),
  PRODUCT_CATEGORY: z.union([
    z.array(z.string()),
    z.string()
  ]).optional().nullable(),
  
  total_price_paid: z.union([
    z.string(),
    z.number()
  ]).optional().nullable(),
  TOTAL_PRICE_PAID: z.union([
    z.string(),
    z.number()
  ]).optional().nullable(),
  
  product_code: z.string().optional().nullable(),
  PRODUCT_CODE: z.string().optional().nullable(),
  
  product_image_url: z.string().url().optional().nullable(),
  PRODUCT_IMAGE_URL: z.string().url().optional().nullable(),
}).refine(
  (data) => data.receipt_id || data.RECEIPT_ID,
  {
    message: "Either receipt_id or RECEIPT_ID must be provided",
    path: ["receipt_id"]
  }
);

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