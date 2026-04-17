-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_supplierId_fkey";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "clientAddress" TEXT,
ADD COLUMN     "clientName" TEXT,
ALTER COLUMN "supplierId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
