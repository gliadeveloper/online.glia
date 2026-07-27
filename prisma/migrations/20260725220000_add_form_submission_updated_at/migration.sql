-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_form_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_form_submissions" ("checkInDate", "formId", "id", "submittedAt", "updatedAt", "userId")
SELECT "checkInDate", "formId", "id", "submittedAt", "submittedAt", "userId" FROM "form_submissions";
DROP TABLE "form_submissions";
ALTER TABLE "new_form_submissions" RENAME TO "form_submissions";
CREATE INDEX "form_submissions_userId_checkInDate_idx" ON "form_submissions"("userId", "checkInDate");
CREATE UNIQUE INDEX "form_submissions_formId_userId_checkInDate_key" ON "form_submissions"("formId", "userId", "checkInDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
