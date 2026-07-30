-- Post hierarchy: parentPostId, rootPostId, childPostCount

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "excerpt" TEXT,
    "parentPostId" TEXT,
    "rootPostId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "childPostCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "editedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "posts_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "posts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_posts" (
    "id", "userId", "slug", "title", "bodyMarkdown", "excerpt", "status",
    "likeCount", "commentCount", "viewCount", "publishedAt", "editedAt", "createdAt", "updatedAt",
    "parentPostId", "rootPostId", "childPostCount"
)
SELECT
    "id", "userId", "slug", "title", "bodyMarkdown", "excerpt", "status",
    "likeCount", "commentCount", "viewCount", "publishedAt", "editedAt", "createdAt", "updatedAt",
    NULL, NULL, 0
FROM "posts";

DROP TABLE "posts";
ALTER TABLE "new_posts" RENAME TO "posts";

CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
CREATE INDEX "posts_status_publishedAt_idx" ON "posts"("status", "publishedAt");
CREATE INDEX "posts_parentPostId_createdAt_idx" ON "posts"("parentPostId", "createdAt");
CREATE INDEX "posts_rootPostId_createdAt_idx" ON "posts"("rootPostId", "createdAt");
CREATE INDEX "posts_userId_createdAt_idx" ON "posts"("userId", "createdAt");
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

PRAGMA foreign_keys=ON;
