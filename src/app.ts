import 'dotenv/config';
import * as express from 'express';
import { db, receipts } from './db/index.js';
import { sql, eq } from 'drizzle-orm';
import { asyncHandler, errorHandler, notFoundHandler, validateRequest, validateParams } from './middleware/index.js';
import { ReceiptInputSchema } from './validation/schemas.js';
import { z } from 'zod';

export function createApp() {
  const app = express.default();

  app.use(express.default.json());

  app.get(
    '/health',
    asyncHandler(async (_req: any, res: any) => {
      // Check database connection
      try {
        await db.execute(sql`SELECT 1`);
      } catch (error) {
        return res.status(500).json({
          status: 'error',
          message:
            'Unable to query against database!, is the docker container running? Is the connection url correct?',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    })
  );

  // Receipt ingestion endpoint
  app.post(
    '/receipt',
    validateRequest(ReceiptInputSchema),
    asyncHandler(async (req: any, res: any) => {
      // Check for force enrichment query parameter
      const forceEnrichment = req.query.enrich === 'true';
      const receiptData = req.body;
      
      // Import enrichment functions
      const { enrichReceiptData, standardizeBrand } = await import('./services/enrichment.js');
      
      // Extract and parse input data
      const productDescription = receiptData.product_description || receiptData.PRODUCT_DESCRIPTION;
      const merchantName = receiptData.merchant_name || receiptData.MERCHANT_NAME;
      const brand = receiptData.brand || receiptData.BRAND;
      
      // Parse product category - handle both arrays and strings
      let productCategory = receiptData.product_category || receiptData.PRODUCT_CATEGORY;
      if (typeof productCategory === 'string' && productCategory.startsWith('[')) {
        try {
          productCategory = JSON.parse(productCategory);
        } catch (e) {
          // Keep as string if JSON parsing fails
        }
      }
      
      // Perform enrichment based on conditions
      let enrichmentResult;
      const needsEnrichment = productDescription && (
        forceEnrichment || // Force enrichment if query param is set
        !brand || 
        !productCategory || 
        (Array.isArray(productCategory) && productCategory.length === 0) ||
        (typeof productCategory === 'string' && !productCategory.trim())
      );
      
      if (needsEnrichment) {
        const productCode = receiptData.product_code || receiptData.PRODUCT_CODE;
        enrichmentResult = await enrichReceiptData(
          productDescription,
          merchantName,
          brand,
          productCode
        );
      }

      // Parse total_price_paid as float
      const totalPricePaid = parseFloat(receiptData.total_price_paid || receiptData.TOTAL_PRICE_PAID || '0');

      // Handle missing fields - fill with enriched data if available and confident
      let finalBrand = brand;
      let finalCategory = productCategory;
      
      if (enrichmentResult) {
        // If brand is missing or enrichment is high confidence, use enriched brand
        if (!brand || enrichmentResult.confidence === 'high') {
          finalBrand = enrichmentResult.brand !== 'unknown' ? enrichmentResult.brand : brand;
        }
        
        // If category is missing or enrichment is high confidence, use enriched category
        if ((!productCategory || 
             (Array.isArray(productCategory) && productCategory.length === 0) ||
             (typeof productCategory === 'string' && !productCategory.trim())) ||
            enrichmentResult.confidence === 'high') {
          finalCategory = enrichmentResult.category.length > 0 && enrichmentResult.category[0] !== 'unknown' 
            ? enrichmentResult.category 
            : productCategory;
        }
      }

      // Insert into database (handle both uppercase and lowercase field names)
      const insertData = {
        receiptId: receiptData.receipt_id || receiptData.RECEIPT_ID,
        productId: receiptData.product_id || receiptData.PRODUCT_ID,
        receiptCreatedTimestamp: (receiptData.receipt_created_timestamp || receiptData.RECEIPT_CREATED_TIMESTAMP) ? 
          new Date(receiptData.receipt_created_timestamp || receiptData.RECEIPT_CREATED_TIMESTAMP) : null,
        merchantName: receiptData.merchant_name || receiptData.MERCHANT_NAME,
        productDescription: receiptData.product_description || receiptData.PRODUCT_DESCRIPTION,
        brand: finalBrand,
        productCategory: finalCategory,
        totalPricePaid: isNaN(totalPricePaid) ? null : totalPricePaid,
        productCode: receiptData.product_code || receiptData.PRODUCT_CODE,
        productImageUrl: receiptData.product_image_url || receiptData.PRODUCT_IMAGE_URL,
        // Always store enriched fields, even if low confidence (marked as "unknown")
        enrichedBrand: enrichmentResult ? standardizeBrand(enrichmentResult.brand) : standardizeBrand(brand),
        enrichedCategory: enrichmentResult ? enrichmentResult.category : null,
        enrichedUpc: enrichmentResult?.upc || null,
        enrichedSize: enrichmentResult?.size || null,
        enrichedColor: enrichmentResult?.color || null,
        enrichedMaterial: enrichmentResult?.material || null,
        enrichedModel: enrichmentResult?.model || null,
        enrichedWeight: enrichmentResult?.weight || null,
        enrichmentConfidence: enrichmentResult?.confidence || null,
      };
      
      const [result] = await db.insert(receipts).values(insertData).returning({ receiptId: receipts.receiptId });
      
      res.status(201).json({
        message: 'Receipt ingested successfully',
        receipt_id: result.receiptId,
        enrichment: enrichmentResult ? {
          brand: enrichmentResult.brand,
          category: enrichmentResult.category,
          upc: enrichmentResult.upc,
          size: enrichmentResult.size,
          color: enrichmentResult.color,
          material: enrichmentResult.material,
          model: enrichmentResult.model,
          weight: enrichmentResult.weight,
          confidence: enrichmentResult.confidence
        } : null
      });
    })
  );

  // Get receipt by receipt_id endpoint
  const receiptParamsSchema = z.object({
    receipt_id: z.string().min(1, 'Receipt ID is required')
  });
  
  app.get(
    '/receipt/:receipt_id',
    validateParams(receiptParamsSchema),
    asyncHandler(async (req: any, res: any) => {
      const { receipt_id } = req.params;
      
      const receipt = await db.select().from(receipts).where(eq(receipts.receiptId, receipt_id)).limit(1);
      
      if (receipt.length === 0) {
        return res.status(404).json({
          error: 'Receipt not found',
          message: `No receipt found with receipt_id: ${receipt_id}`
        });
      }
      
      const receiptData = receipt[0];
      res.json({
        ...receiptData,
        // JSONB fields are already parsed by Drizzle, no need to JSON.parse
      });
    })
  );

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}