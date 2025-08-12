-- Update product_category to jsonb with conversion
ALTER TABLE "receipts" ALTER COLUMN "product_category" SET DATA TYPE jsonb USING 
  CASE 
    WHEN product_category IS NULL THEN NULL
    WHEN product_category ~ '^\[.*\]$' THEN product_category::jsonb
    ELSE to_jsonb(product_category)
  END;--> statement-breakpoint

-- Update total_price_paid to real (float)
ALTER TABLE "receipts" ALTER COLUMN "total_price_paid" SET DATA TYPE real USING total_price_paid::real;--> statement-breakpoint

-- Update enriched_category to jsonb with conversion
ALTER TABLE "receipts" ALTER COLUMN "enriched_category" SET DATA TYPE jsonb USING 
  CASE 
    WHEN enriched_category IS NULL THEN NULL
    WHEN enriched_category ~ '^\[.*\]$' THEN enriched_category::jsonb
    ELSE to_jsonb(enriched_category)
  END;