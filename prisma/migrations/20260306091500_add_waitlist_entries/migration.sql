-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'TRIAL_SENT', 'CONVERTED', 'DECLINED');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "trialToken" TEXT,
    "trialSentAt" TIMESTAMP(3),
    "salesClientId" TEXT,
    "invitedByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_trialToken_key" ON "WaitlistEntry"("trialToken");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_salesClientId_key" ON "WaitlistEntry"("salesClientId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_salesClientId_fkey" FOREIGN KEY ("salesClientId") REFERENCES "SalesClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_invitedByEmployeeId_fkey" FOREIGN KEY ("invitedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
