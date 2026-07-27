-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'SURVEY',
    "schedule" TEXT NOT NULL DEFAULT 'ONCE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "openTime" TEXT,
    "closeTime" TEXT,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT,
    "courseId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "forms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "forms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "forms_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    CONSTRAINT "form_questions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "emoji" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "form_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "form_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT,
    "optionIds" JSONB,
    "textValue" TEXT,
    "numberValue" REAL,
    CONSTRAINT "form_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_answers_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "form_options" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "forms_slug_key" ON "forms"("slug");

-- CreateIndex
CREATE INDEX "forms_purpose_status_idx" ON "forms"("purpose", "status");

-- CreateIndex
CREATE INDEX "form_questions_formId_order_idx" ON "form_questions"("formId", "order");

-- CreateIndex
CREATE INDEX "form_options_questionId_order_idx" ON "form_options"("questionId", "order");

-- CreateIndex
CREATE INDEX "form_submissions_userId_checkInDate_idx" ON "form_submissions"("userId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_formId_userId_checkInDate_key" ON "form_submissions"("formId", "userId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "form_answers_submissionId_questionId_key" ON "form_answers"("submissionId", "questionId");
