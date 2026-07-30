import { notFound, redirect } from "next/navigation";

import { AppSection, AppSectionHeader, AppStackPage } from "@/components/app";
import { CoachingMarkdown } from "@/components/coaching/coaching-markdown";
import { CoachingSessionQnaPanel } from "@/components/coaching/coaching-session-qna-panel";
import { Typography } from "@/components/typography/typography";
import { getCoachingSessionForUser } from "@/lib/coaching";
import { coachingPublicationLabels } from "@/lib/customer-labels";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type CoachingSessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachingSessionPage({ params }: CoachingSessionPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/coaching");
  }

  const { id } = await params;
  const session = await getCoachingSessionForUser(id, user.id);

  if (session.publicationStatus !== "PUBLISHED" || !session.bodyMarkdown) {
    notFound();
  }

  return (
    <AppStackPage>
      <StackNavTitle title={session.title} />

      <header className="app-section">
        <Typography as="p" role="caption" weight="medium" color="action">
          {session.sessionNo}회차
        </Typography>
        <Typography as="h1" role="pageTitle" weight="semibold" color="primary">
          {session.title}
        </Typography>
        <Typography as="p" role="bodySecondary" color="secondary">
          담당 {session.coach.name ?? session.coach.email} ·{" "}
          {coachingPublicationLabels[session.publicationStatus]}
        </Typography>
        {session.summary && (
          <Typography as="p" role="bodySecondary" color="secondary">
            {session.summary}
          </Typography>
        )}
      </header>

      <CoachingMarkdown content={session.bodyMarkdown} />

      <AppSection labelledBy="coaching-qna-heading">
        <AppSectionHeader
          title="질의응답"
          titleId="coaching-qna-heading"
          description="코치가 확인 후 답변을 남깁니다. 실시간 채팅이 아닙니다."
        />
        <CoachingSessionQnaPanel
          sessionId={session.id}
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
        />
      </AppSection>
    </AppStackPage>
  );
}
