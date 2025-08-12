CREATE TABLE IF NOT EXISTS "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" text,
	"product_id" text,
	"receipt_created_timestamp" timestamp,
	"merchant_name" text,
	"product_description" text,
	"brand" text,
	"product_category" text,
	"total_price_paid" numeric,
	"product_code" text,
	"product_image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
