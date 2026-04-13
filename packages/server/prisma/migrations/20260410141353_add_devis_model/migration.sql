/*
  Warnings:

  - You are about to drop the column `clientId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_clientId_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "appointmentId" INTEGER,
ADD COLUMN     "callId" INTEGER,
ADD COLUMN     "requestId" INTEGER,
ADD COLUMN     "taskId" INTEGER;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "clientId";

-- CreateTable
CREATE TABLE "Call" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "initiatorId" INTEGER NOT NULL,
    "callType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "participants" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_attente',
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "validUntil" DATE NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lines" JSONB NOT NULL,
    "notes" TEXT,
    "amountHT" DOUBLE PRECISION NOT NULL,
    "amountTVA" DOUBLE PRECISION NOT NULL,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "pdfUrl" TEXT,
    "ownerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "createdByCompanyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_clients" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Call_roomId_idx" ON "Call"("roomId");

-- CreateIndex
CREATE INDEX "Call_initiatorId_idx" ON "Call"("initiatorId");

-- CreateIndex
CREATE INDEX "Call_status_idx" ON "Call"("status");

-- CreateIndex
CREATE INDEX "Call_startedAt_idx" ON "Call"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "devis_number_key" ON "devis"("number");

-- CreateIndex
CREATE INDEX "devis_ownerId_idx" ON "devis"("ownerId");

-- CreateIndex
CREATE INDEX "devis_companyId_idx" ON "devis"("companyId");

-- CreateIndex
CREATE INDEX "devis_status_idx" ON "devis"("status");

-- CreateIndex
CREATE INDEX "devis_createdAt_idx" ON "devis"("createdAt");

-- CreateIndex
CREATE INDEX "task_clients_taskId_idx" ON "task_clients"("taskId");

-- CreateIndex
CREATE INDEX "task_clients_clientId_idx" ON "task_clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "task_clients_taskId_clientId_key" ON "task_clients"("taskId", "clientId");

-- CreateIndex
CREATE INDEX "ChatMessage_requestId_idx" ON "ChatMessage"("requestId");

-- CreateIndex
CREATE INDEX "ChatMessage_taskId_idx" ON "ChatMessage"("taskId");

-- CreateIndex
CREATE INDEX "ChatMessage_appointmentId_idx" ON "ChatMessage"("appointmentId");

-- CreateIndex
CREATE INDEX "ChatMessage_callId_idx" ON "ChatMessage"("callId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_createdByCompanyId_fkey" FOREIGN KEY ("createdByCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_clients" ADD CONSTRAINT "task_clients_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_clients" ADD CONSTRAINT "task_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
