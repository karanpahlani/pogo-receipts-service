import { pgTable, text, timestamp, decimal, uuid, index } from 'drizzle-orm/pg-core';

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptId: text('receipt_id'),
    productId: text('product_id'),
    receiptCreatedTimestamp: timestamp('receipt_created_timestamp'),
    merchantName: text('merchant_name'),
    productDescription: text('product_description'),
    brand: text('brand'),
    productCategory: text('product_category'),
    totalPricePaid: decimal('total_price_paid'),
    productCode: text('product_code'),
    productImageUrl: text('product_image_url'),
    // Enrichment fields
    enrichedBrand: text('enriched_brand'),
    enrichedCategory: text('enriched_category'), // JSON string
    enrichmentConfidence: text('enrichment_confidence'), // 'high' | 'medium' | 'low'
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  () => {
    // create indices here
    // See docs for details: https://orm.drizzle.team/docs/indexes-constraints
    return {};
  }
);

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
