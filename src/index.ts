import 'dotenv/config';
import express from 'express';
import { db, receipts } from './db';
import { sql, eq } from 'drizzle-orm';
import { asyncHandler, errorHandler, notFoundHandler } from './middleware';

const app = express();
const PORT = process.env.PORT || 7646;

app.use(express.json());

app.get(
  '/health',
  asyncHandler(async (_req, res) => {
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
  '/',
  asyncHandler(async (req, res) => {
    const receiptData = req.body;
    
    // Import enrichment functions
    const { enrichReceiptData, standardizeBrand } = await import('./services/enrichment');
    
    // Perform enrichment if we have product description
    let enrichmentResult;
    const productDescription = receiptData.product_description || receiptData.PRODUCT_DESCRIPTION;
    const merchantName = receiptData.merchant_name || receiptData.MERCHANT_NAME;
    const brand = receiptData.brand || receiptData.BRAND;
    
    if (productDescription) {
      enrichmentResult = await enrichReceiptData(
        productDescription,
        merchantName,
        brand
      );
    }
    
    // Insert into database (handle both uppercase and lowercase field names)
    const insertData = {
      receiptId: receiptData.receipt_id || receiptData.RECEIPT_ID,
      productId: receiptData.product_id || receiptData.PRODUCT_ID,
      receiptCreatedTimestamp: (receiptData.receipt_created_timestamp || receiptData.RECEIPT_CREATED_TIMESTAMP) ? 
        new Date(receiptData.receipt_created_timestamp || receiptData.RECEIPT_CREATED_TIMESTAMP) : null,
      merchantName: receiptData.merchant_name || receiptData.MERCHANT_NAME,
      productDescription: receiptData.product_description || receiptData.PRODUCT_DESCRIPTION,
      brand: receiptData.brand || receiptData.BRAND,
      productCategory: Array.isArray(receiptData.product_category || receiptData.PRODUCT_CATEGORY) ? 
        JSON.stringify(receiptData.product_category || receiptData.PRODUCT_CATEGORY) : 
        (receiptData.product_category || receiptData.PRODUCT_CATEGORY),
      totalPricePaid: (receiptData.total_price_paid || receiptData.TOTAL_PRICE_PAID)?.toString(),
      productCode: receiptData.product_code || receiptData.PRODUCT_CODE,
      productImageUrl: receiptData.product_image_url || receiptData.PRODUCT_IMAGE_URL,
      enrichedBrand: enrichmentResult ? standardizeBrand(enrichmentResult.brand) : null,
      enrichedCategory: enrichmentResult ? JSON.stringify(enrichmentResult.category) : null,
      enrichmentConfidence: enrichmentResult?.confidence || null,
    };
    
    const [result] = await db.insert(receipts).values(insertData).returning({ id: receipts.id });
    
    res.status(201).json({
      message: 'Receipt ingested successfully',
      id: result.id,
      enrichment: enrichmentResult ? {
        brand: enrichmentResult.brand,
        category: enrichmentResult.category,
        confidence: enrichmentResult.confidence
      } : null
    });
  })
);

// Get receipt by ID endpoint
app.get(
  '/receipts/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const receipt = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
    
    if (receipt.length === 0) {
      return res.status(404).json({
        error: 'Receipt not found',
        message: `No receipt found with ID: ${id}`
      });
    }
    
    const receiptData = receipt[0];
    res.json({
      ...receiptData,
      enrichedCategory: receiptData.enrichedCategory ? JSON.parse(receiptData.enrichedCategory) : null
    });
  })
);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
