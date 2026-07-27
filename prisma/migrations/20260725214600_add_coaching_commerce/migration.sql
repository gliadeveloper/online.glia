-- CreateTable
CREATE TABLE "coaching_offerings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "deliveryMode" TEXT NOT NULL DEFAULT 'LIVE',
    "totalSessions" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxQuestions" INTEGER,
    "responseDays" INTEGER,
    "coachId" TEXT,
    "courseId" TEXT,
    "cancelPolicy" JSONB,
    "refundPolicy" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_offerings_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_offerings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "listPrice" INTEGER NOT NULL,
    "salePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "courseId" TEXT,
    "coachingOfferingId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "product_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "product_items_coachingOfferingId_fkey" FOREIGN KEY ("coachingOfferingId") REFERENCES "coaching_offerings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "idempotencyKey" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    CONSTRAINT "order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fulfillments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfilledAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fulfillments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "entitlement_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fulfillmentId" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "coachingEntitlementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entitlement_grants_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entitlement_grants_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entitlement_grants_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "product_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "entitlement_grants_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "entitlement_grants_coachingEntitlementId_fkey" FOREIGN KEY ("coachingEntitlementId") REFERENCES "coaching_entitlements" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaching_entitlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coachingOfferingId" TEXT NOT NULL,
    "coachId" TEXT,
    "courseId" TEXT,
    "enrollmentId" TEXT,
    "totalSessions" INTEGER NOT NULL,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "reservedSessions" INTEGER NOT NULL DEFAULT 0,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_coachingOfferingId_fkey" FOREIGN KEY ("coachingOfferingId") REFERENCES "coaching_offerings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_entitlements_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaching_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entitlementId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "meetingUrl" TEXT,
    "meetingProvider" TEXT,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "coaching_sessions_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "coaching_entitlements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coaching_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaching_session_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coaching_session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_session_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaching_intakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entitlementId" TEXT NOT NULL,
    "sessionId" TEXT,
    "answers" JSONB NOT NULL,
    "attachments" JSONB,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coaching_intakes_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "coaching_entitlements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "coaching_intakes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaching_feedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entitlementId" TEXT,
    "sessionId" TEXT,
    "coachId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coaching_feedbacks_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "coaching_entitlements" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_feedbacks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "coaching_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "coaching_feedbacks_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "coaching_offerings_slug_key" ON "coaching_offerings"("slug");

-- CreateIndex
CREATE INDEX "coaching_offerings_coachId_idx" ON "coaching_offerings"("coachId");

-- CreateIndex
CREATE INDEX "coaching_offerings_courseId_idx" ON "coaching_offerings"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_kind_isActive_idx" ON "products"("kind", "isActive");

-- CreateIndex
CREATE INDEX "product_items_productId_sortOrder_idx" ON "product_items"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "orders_userId_status_idx" ON "orders"("userId", "status");

-- CreateIndex
CREATE INDEX "order_lines_orderId_idx" ON "order_lines"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerRef_key" ON "payments"("providerRef");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE INDEX "fulfillments_orderId_idx" ON "fulfillments"("orderId");

-- CreateIndex
CREATE INDEX "entitlement_grants_fulfillmentId_idx" ON "entitlement_grants"("fulfillmentId");

-- CreateIndex
CREATE INDEX "entitlement_grants_orderLineId_idx" ON "entitlement_grants"("orderLineId");

-- CreateIndex
CREATE INDEX "coaching_entitlements_userId_status_idx" ON "coaching_entitlements"("userId", "status");

-- CreateIndex
CREATE INDEX "coaching_entitlements_coachingOfferingId_idx" ON "coaching_entitlements"("coachingOfferingId");

-- CreateIndex
CREATE INDEX "coaching_sessions_entitlementId_sessionNo_idx" ON "coaching_sessions"("entitlementId", "sessionNo");

-- CreateIndex
CREATE INDEX "coaching_sessions_coachId_scheduledAt_idx" ON "coaching_sessions"("coachId", "scheduledAt");

-- CreateIndex
CREATE INDEX "coaching_sessions_userId_scheduledAt_idx" ON "coaching_sessions"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "coaching_session_events_sessionId_createdAt_idx" ON "coaching_session_events"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coaching_intakes_sessionId_key" ON "coaching_intakes"("sessionId");

-- CreateIndex
CREATE INDEX "coaching_intakes_entitlementId_idx" ON "coaching_intakes"("entitlementId");

-- CreateIndex
CREATE UNIQUE INDEX "coaching_feedbacks_sessionId_key" ON "coaching_feedbacks"("sessionId");

-- CreateIndex
CREATE INDEX "coaching_feedbacks_entitlementId_idx" ON "coaching_feedbacks"("entitlementId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_scope_expiresAt_idx" ON "idempotency_keys"("scope", "expiresAt");
