ALTER TABLE "discussions" ADD COLUMN "upvoteCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "discussion_replies" ADD COLUMN "upvoteCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "discussion_votes" (
  "id" TEXT NOT NULL,
  "discussionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discussion_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discussion_reply_votes" (
  "id" TEXT NOT NULL,
  "replyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discussion_reply_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discussion_votes_discussionId_userId_key" ON "discussion_votes"("discussionId", "userId");
CREATE UNIQUE INDEX "discussion_reply_votes_replyId_userId_key" ON "discussion_reply_votes"("replyId", "userId");
CREATE INDEX "discussions_lessonId_upvoteCount_createdAt_idx" ON "discussions"("lessonId", "upvoteCount", "createdAt");
CREATE INDEX "discussion_replies_discussionId_isAccepted_upvoteCount_idx" ON "discussion_replies"("discussionId", "isAccepted", "upvoteCount");

ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_reply_votes" ADD CONSTRAINT "discussion_reply_votes_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_reply_votes" ADD CONSTRAINT "discussion_reply_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_events" ADD COLUMN "discussionId" TEXT;
ALTER TABLE "notification_events" ADD COLUMN "discussionReplyId" TEXT;
CREATE UNIQUE INDEX "notification_events_discussionId_key" ON "notification_events"("discussionId");
CREATE UNIQUE INDEX "notification_events_discussionReplyId_key" ON "notification_events"("discussionReplyId");

ALTER TABLE "notification_events" DROP CONSTRAINT IF EXISTS "notification_events_source_matches_type";
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_source_matches_type" CHECK (
  ("type" = 'COACHING_SESSION_PUBLISHED' AND "coachingSessionId" IS NOT NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NULL AND "discussionId" IS NULL AND "discussionReplyId" IS NULL)
  OR ("type" = 'COACHING_COMMENT' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NOT NULL AND "liveSessionId" IS NULL AND "discussionId" IS NULL AND "discussionReplyId" IS NULL)
  OR ("type" = 'LIVE_STARTED' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NOT NULL AND "discussionId" IS NULL AND "discussionReplyId" IS NULL)
  OR ("type" = 'LESSON_QUESTION' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NULL AND "discussionId" IS NOT NULL AND "discussionReplyId" IS NULL)
  OR ("type" = 'LESSON_QUESTION_REPLY' AND "coachingSessionId" IS NULL AND "coachingMessageId" IS NULL AND "liveSessionId" IS NULL AND "discussionId" IS NULL AND "discussionReplyId" IS NOT NULL)
);

ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_discussionReplyId_fkey" FOREIGN KEY ("discussionReplyId") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
