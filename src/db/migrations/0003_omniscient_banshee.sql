-- Drop the existing primary key constraint on id column
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_pkey";--> statement-breakpoint

-- Set receipt_id to NOT NULL (required for primary key)
ALTER TABLE "receipts" ALTER COLUMN "receipt_id" SET NOT NULL;--> statement-breakpoint

-- Add primary key constraint on receipt_id
ALTER TABLE "receipts" ADD PRIMARY KEY ("receipt_id");--> statement-breakpoint

-- Drop the old id column
ALTER TABLE "receipts" DROP COLUMN IF EXISTS "id";