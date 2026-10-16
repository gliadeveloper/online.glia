-- CreateTable
CREATE TABLE "product_groups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "descriptionMetadata" JSONB,
    "thumbnailUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_groups_isActive_publishedAt_idx" ON "product_groups"("isActive", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_members_productId_key" ON "product_group_members"("productId");

-- CreateIndex
CREATE INDEX "product_group_members_groupId_sortOrder_idx" ON "product_group_members"("groupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_group_members_groupId_label_key" ON "product_group_members"("groupId", "label");

-- AddForeignKey
ALTER TABLE "product_group_members" ADD CONSTRAINT "product_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_group_members" ADD CONSTRAINT "product_group_members_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
