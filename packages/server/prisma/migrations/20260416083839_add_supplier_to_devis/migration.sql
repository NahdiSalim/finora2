/*
  Warnings:

  - Made the column `supplierId` on table `invoices` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "devis" ADD COLUMN     "supplierId" INTEGER;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "supplierId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "devis_supplierId_idx" ON "devis"("supplierId");

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
