-- AlterTable
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "clientName";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "clientAddress";
ALTER TABLE "invoices" ADD COLUMN "supplierId" INTEGER;

-- Create index
CREATE INDEX IF NOT EXISTS "invoices_supplierId_idx" ON "invoices"("supplierId");

-- Add foreign key constraint (will fail if suppliers don't exist for existing invoices)
-- You may need to manually set supplierId for existing invoices before running this
ALTER TABLE "invoices" 
  ADD CONSTRAINT "invoices_supplierId_fkey" 
  FOREIGN KEY ("supplierId") 
  REFERENCES "suppliers"("id") 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

-- Make supplierId NOT NULL after data migration
-- ALTER TABLE "invoices" ALTER COLUMN "supplierId" SET NOT NULL;
