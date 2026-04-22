-- CreateTable
CREATE TABLE "bons_commande" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'brouillon',
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "validUntil" DATE NOT NULL,
    "lines" JSONB NOT NULL,
    "notes" TEXT,
    "amountHT" DOUBLE PRECISION NOT NULL,
    "amountTVA" DOUBLE PRECISION NOT NULL,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "createdByCompanyId" INTEGER,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_livraison" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_attente',
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "deliveryDate" DATE NOT NULL,
    "lines" JSONB NOT NULL,
    "notes" TEXT,
    "amountHT" DOUBLE PRECISION NOT NULL,
    "amountTVA" DOUBLE PRECISION NOT NULL,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "createdByCompanyId" INTEGER,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_number_key" ON "bons_commande"("number");

-- CreateIndex
CREATE INDEX "bons_commande_companyId_idx" ON "bons_commande"("companyId");

-- CreateIndex
CREATE INDEX "bons_commande_supplierId_idx" ON "bons_commande"("supplierId");

-- CreateIndex
CREATE INDEX "bons_commande_status_idx" ON "bons_commande"("status");

-- CreateIndex
CREATE INDEX "bons_commande_createdAt_idx" ON "bons_commande"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bons_livraison_number_key" ON "bons_livraison"("number");

-- CreateIndex
CREATE INDEX "bons_livraison_companyId_idx" ON "bons_livraison"("companyId");

-- CreateIndex
CREATE INDEX "bons_livraison_supplierId_idx" ON "bons_livraison"("supplierId");

-- CreateIndex
CREATE INDEX "bons_livraison_status_idx" ON "bons_livraison"("status");

-- CreateIndex
CREATE INDEX "bons_livraison_deliveryDate_idx" ON "bons_livraison"("deliveryDate");

-- CreateIndex
CREATE INDEX "bons_livraison_createdAt_idx" ON "bons_livraison"("createdAt");

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
