import { notFound } from "next/navigation";

import { CoachSessionWorkspace } from "@/components/coach/coach-session-workspace";
import { ApiError } from "@/lib/api";
import { getCoachSessionDetail } from "@/lib/coaching-coach";
import { requireCoach } from "@/lib/coach";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CoachSessionDetailPage({ params, searchParams }: Props) {
  const user = await requireCoach();
  const { id } = await params;
  const { tab } = await searchParams;

  let session;
  try {
    session = await getCoachSessionDetail(id, user.id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const pendingReplyCount =
    session.conversation?.messages.filter((message) => message.awaitingReply).length ?? 0;

  return (
    <CoachSessionWorkspace
      sessionId={session.id}
      entitlementId={session.entitlement.id}
      sessionNo={session.sessionNo}
      title={session.title}
      studentName={session.user.name ?? session.user.email}
      studentEmail={session.user.email}
      offeringTitle={session.entitlement.coachingOffering.title}
      scheduledAt={session.scheduledAt.toISOString()}
      publicationStatus={session.publicationStatus}
      pendingReplyCount={pendingReplyCount}
      logCount={session.logs.length}
      initialTab={tab === "qna" ? "qna" : tab === "logs" ? "logs" : "feedback"}
      summary={session.summary}
      bodyMarkdown={session.bodyMarkdown}
      bodyMetadata={session.bodyMetadata}
      messages={
        session.conversation?.messages.map((message) => ({
          id: message.id,
          authorRole: message.authorRole,
          authorName: message.author.name ?? message.author.email,
          bodyMarkdown: message.bodyMarkdown,
          awaitingReply: message.awaitingReply,
          createdAt: message.createdAt.toISOString(),
        })) ?? []
      }
      logs={session.logs.map((log) => ({
        id: log.id,
        body: log.body,
        createdAt: log.createdAt.toISOString(),
      }))}
    />
  );
}
