import { pgTable, text, timestamp, real, jsonb } from 'drizzle-orm/pg-core';
export const receipts = pgTable('receipts', {
    // Using receipt_id as primary key since it's guaranteed unique in this dataset
    // In real-world scenarios, receipts might not have IDs or could have duplicates.
    // We would generate unique IDs like this:
    // id: uuid('id').primaryKey().defaultRandom(), // UUID v4
    // or: serial('id').primaryKey(), // Auto-incrementing integer
    // or: text('id').primaryKey().$default(() => `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`), // Custom format
    receiptId: text('receipt_id').primaryKey(), // Using receipt_id as PK for this dataset
    productId: text('product_id'),
    receiptCreatedTimestamp: timestamp('receipt_created_timestamp'),
    merchantName: text('merchant_name'),
    productDescription: text('product_description'),
    brand: text('brand'),
    productCategory: jsonb('product_category'), // array/string - three-level hierarchy
    totalPricePaid: real('total_price_paid'), // float
    productCode: text('product_code'),
    productImageUrl: text('product_image_url'),
    // Enrichment fields (separate from core schema but useful for the pipeline)
    enrichedBrand: text('enriched_brand'),
    enrichedCategory: jsonb('enriched_category'), // JSON array
    enrichedUpc: text('enriched_upc'), // 12-digit UPC code
    enrichedSize: text('enriched_size'), // Size/dimensions (e.g., "13-inch", "Large", "64GB")
    enrichedColor: text('enriched_color'), // Primary color
    enrichedMaterial: text('enriched_material'), // Material (e.g., "Cotton", "Aluminum")
    enrichedModel: text('enriched_model'), // Model/variant (e.g., "Pro Max", "Air")
    enrichedWeight: text('enriched_weight'), // Weight with units (e.g., "1.5 lbs", "200g")
    enrichmentConfidence: text('enrichment_confidence'), // 'high' | 'medium' | 'low'
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, () => {
    // create indices here
    // See docs for details: https://orm.drizzle.team/docs/indexes-constraints
    return {};
});
