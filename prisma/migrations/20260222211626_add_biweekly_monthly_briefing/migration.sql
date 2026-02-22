-- CreateTable
CREATE TABLE "BiWeeklyBriefing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "metricsData" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiWeeklyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBriefing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportMonth" DATE NOT NULL,
    "metricsData" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiWeeklyBriefing_userId_idx" ON "BiWeeklyBriefing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BiWeeklyBriefing_userId_periodStart_key" ON "BiWeeklyBriefing"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "MonthlyBriefing_userId_idx" ON "MonthlyBriefing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBriefing_userId_reportMonth_key" ON "MonthlyBriefing"("userId", "reportMonth");

-- AddForeignKey
ALTER TABLE "BiWeeklyBriefing" ADD CONSTRAINT "BiWeeklyBriefing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBriefing" ADD CONSTRAINT "MonthlyBriefing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
