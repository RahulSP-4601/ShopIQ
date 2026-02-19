-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('FOUNDER', 'SALES_MEMBER');

-- CreateEnum
CREATE TYPE "MarketplaceType" AS ENUM ('SHOPIFY', 'AMAZON', 'EBAY', 'ETSY', 'WOOCOMMERCE', 'BIGCOMMERCE', 'WIX', 'SQUARE', 'MAGENTO', 'PRESTASHOP', 'FLIPKART', 'SNAPDEAL');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PENDING_CANCELLATION', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('REVENUE_SUMMARY', 'PRODUCT_ANALYSIS', 'CUSTOMER_INSIGHTS', 'FULL_ANALYSIS');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrialRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "UnifiedOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "UnifiedProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SESSION_CREATED', 'SESSION_REVOKED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'MARKETPLACE_CONNECTED', 'MARKETPLACE_DISCONNECTED');

-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('positive', 'negative');

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('FASHION', 'ELECTRONICS', 'HOME_GARDEN', 'FOOD_BEVERAGE', 'HEALTH_BEAUTY', 'SPORTS_OUTDOOR', 'TOYS_GAMES', 'BOOKS_MEDIA', 'AUTOMOTIVE', 'JEWELRY', 'HANDMADE_CRAFT', 'PET_SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessSize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "passwordHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "bootstrappedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "refCode" TEXT,
    "commissionRate" DECIMAL(5,2),
    "resetTokenHash" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "externalId" TEXT,
    "externalName" TEXT,
    "webhookSecret" TEXT,
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "syncStartedAt" TIMESTAMP(3),
    "syncLockVersion" INTEGER NOT NULL DEFAULT 0,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 999,
    "additionalPrice" DECIMAL(10,2) NOT NULL DEFAULT 449,
    "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 999,
    "marketplaceCount" INTEGER NOT NULL DEFAULT 2,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + '30 days'::interval),
    "razorpayCustomerId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "razorpayPlanId" TEXT,
    "razorpaySyncPending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "queryData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "content" JSONB NOT NULL,
    "summary" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "refCode" TEXT,
    "status" "TrialRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesClient" (
    "id" TEXT NOT NULL,
    "salesMemberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "TrialRequestStatus" NOT NULL DEFAULT 'PENDING',
    "trialRequestId" TEXT,
    "trialToken" TEXT,
    "trialSentAt" TIMESTAMP(3),
    "clientUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "salesMemberId" TEXT NOT NULL,
    "salesClientId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "period" TEXT NOT NULL DEFAULT 'INITIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "status" "UnifiedOrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "totalAmountUSD" DECIMAL(10,2),
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "status" "UnifiedProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "imageUrl" TEXT,
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "externalItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedSyncLog" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "entity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCount" INTEGER,
    "syncedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UnifiedSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RazorpayPlan" (
    "id" TEXT NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RazorpayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Belief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL DEFAULT '*',
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "autonomyMode" TEXT NOT NULL DEFAULT 'PROPOSAL',
    "validatedCycles" INTEGER NOT NULL DEFAULT 0,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Belief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "basePriority" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'ai',
    "ttlHours" INTEGER NOT NULL DEFAULT 24,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "dedupKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "surfacedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageFeedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyBriefing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "metricsData" JSONB NOT NULL,
    "narrative" TEXT NOT NULL,
    "maturity" JSONB NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMaturitySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "geometricMeanReliability" DOUBLE PRECISION NOT NULL,
    "stage" TEXT NOT NULL,
    "aiYears" DOUBLE PRECISION NOT NULL,
    "totalBeliefs" INTEGER NOT NULL,
    "highConfidenceCount" INTEGER NOT NULL,
    "lowConfidenceCount" INTEGER NOT NULL,
    "totalValidatedCycles" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMaturitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" "IndustryType" NOT NULL,
    "businessSize" "BusinessSize" NOT NULL,
    "primaryCategory" TEXT,
    "targetMarket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetTokenHash_key" ON "User"("resetTokenHash");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_refCode_key" ON "Employee"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_resetTokenHash_key" ON "Employee"("resetTokenHash");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "MarketplaceConnection_userId_idx" ON "MarketplaceConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConnection_userId_marketplace_key" ON "MarketplaceConnection"("userId", "marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "TrialRequest_email_idx" ON "TrialRequest"("email");

-- CreateIndex
CREATE INDEX "TrialRequest_createdAt_idx" ON "TrialRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesClient_trialRequestId_key" ON "SalesClient"("trialRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesClient_trialToken_key" ON "SalesClient"("trialToken");

-- CreateIndex
CREATE UNIQUE INDEX "SalesClient_clientUserId_key" ON "SalesClient"("clientUserId");

-- CreateIndex
CREATE INDEX "SalesClient_salesMemberId_idx" ON "SalesClient"("salesMemberId");

-- CreateIndex
CREATE INDEX "SalesClient_email_idx" ON "SalesClient"("email");

-- CreateIndex
CREATE INDEX "Commission_salesMemberId_idx" ON "Commission"("salesMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_salesMemberId_salesClientId_period_key" ON "Commission"("salesMemberId", "salesClientId", "period");

-- CreateIndex
CREATE INDEX "UnifiedOrder_userId_marketplace_idx" ON "UnifiedOrder"("userId", "marketplace");

-- CreateIndex
CREATE INDEX "UnifiedOrder_userId_orderedAt_idx" ON "UnifiedOrder"("userId", "orderedAt");

-- CreateIndex
CREATE INDEX "UnifiedOrder_connectionId_idx" ON "UnifiedOrder"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedOrder_connectionId_externalOrderId_key" ON "UnifiedOrder"("connectionId", "externalOrderId");

-- CreateIndex
CREATE INDEX "UnifiedProduct_userId_marketplace_idx" ON "UnifiedProduct"("userId", "marketplace");

-- CreateIndex
CREATE INDEX "UnifiedProduct_userId_sku_idx" ON "UnifiedProduct"("userId", "sku");

-- CreateIndex
CREATE INDEX "UnifiedProduct_connectionId_idx" ON "UnifiedProduct"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedProduct_connectionId_externalId_key" ON "UnifiedProduct"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "UnifiedOrderItem_orderId_idx" ON "UnifiedOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "UnifiedOrderItem_productId_idx" ON "UnifiedOrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedOrderItem_orderId_externalItemId_key" ON "UnifiedOrderItem"("orderId", "externalItemId");

-- CreateIndex
CREATE INDEX "UnifiedSyncLog_connectionId_idx" ON "UnifiedSyncLog"("connectionId");

-- CreateIndex
CREATE INDEX "UnifiedSyncLog_marketplace_startedAt_idx" ON "UnifiedSyncLog"("marketplace", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_jti_key" ON "RevokedToken"("jti");

-- CreateIndex
CREATE INDEX "RevokedToken_userId_idx" ON "RevokedToken"("userId");

-- CreateIndex
CREATE INDEX "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_marketplace_eventId_key" ON "WebhookEvent"("marketplace", "eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processedAt_idx" ON "PaymentWebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_eventId_key" ON "PaymentWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayPlan_amountInPaise_key" ON "RazorpayPlan"("amountInPaise");

-- CreateIndex
CREATE INDEX "Belief_userId_idx" ON "Belief"("userId");

-- CreateIndex
CREATE INDEX "Belief_userId_strength_idx" ON "Belief"("userId", "strength");

-- CreateIndex
CREATE UNIQUE INDEX "Belief_userId_statement_contextKey_key" ON "Belief"("userId", "statement", "contextKey");

-- CreateIndex
CREATE INDEX "Note_userId_status_idx" ON "Note"("userId", "status");

-- CreateIndex
CREATE INDEX "Note_userId_expiresAt_idx" ON "Note"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Note_expiresAt_idx" ON "Note"("expiresAt");

-- CreateIndex
CREATE INDEX "Alert_userId_status_idx" ON "Alert"("userId", "status");

-- CreateIndex
CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_userId_type_createdAt_idx" ON "Alert"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_userId_type_dedupKey_key" ON "Alert"("userId", "type", "dedupKey");

-- CreateIndex
CREATE UNIQUE INDEX "MessageFeedback_messageId_key" ON "MessageFeedback"("messageId");

-- CreateIndex
CREATE INDEX "MessageFeedback_userId_idx" ON "MessageFeedback"("userId");

-- CreateIndex
CREATE INDEX "WeeklyBriefing_userId_idx" ON "WeeklyBriefing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBriefing_userId_weekStart_key" ON "WeeklyBriefing"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "AiMaturitySnapshot_userId_createdAt_idx" ON "AiMaturitySnapshot"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

-- AddForeignKey
ALTER TABLE "MarketplaceConnection" ADD CONSTRAINT "MarketplaceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesClient" ADD CONSTRAINT "SalesClient_salesMemberId_fkey" FOREIGN KEY ("salesMemberId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesClient" ADD CONSTRAINT "SalesClient_trialRequestId_fkey" FOREIGN KEY ("trialRequestId") REFERENCES "TrialRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesClient" ADD CONSTRAINT "SalesClient_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_salesMemberId_fkey" FOREIGN KEY ("salesMemberId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_salesClientId_fkey" FOREIGN KEY ("salesClientId") REFERENCES "SalesClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedOrder" ADD CONSTRAINT "UnifiedOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedOrder" ADD CONSTRAINT "UnifiedOrder_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MarketplaceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedProduct" ADD CONSTRAINT "UnifiedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedProduct" ADD CONSTRAINT "UnifiedProduct_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MarketplaceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedOrderItem" ADD CONSTRAINT "UnifiedOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "UnifiedOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedOrderItem" ADD CONSTRAINT "UnifiedOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "UnifiedProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedSyncLog" ADD CONSTRAINT "UnifiedSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "MarketplaceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Belief" ADD CONSTRAINT "Belief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFeedback" ADD CONSTRAINT "MessageFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyBriefing" ADD CONSTRAINT "WeeklyBriefing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMaturitySnapshot" ADD CONSTRAINT "AiMaturitySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

