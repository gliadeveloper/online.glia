import { notFound, redirect } from "next/navigation";

import { AppSection, AppSectionHeader, AppStackPage } from "@/components/app";
import { CoachingCoachProfile } from "@/components/coaching/coaching-coach-profile";
import { CoachingMarkdown } from "@/components/coaching/coaching-markdown";
import { CoachingSessionQnaPanel } from "@/components/coaching/coaching-session-qna-panel";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { getCoachingSessionForUser } from "@/lib/coaching";
import { coachingSessionHasBody } from "@/lib/coaching-session-content";
import { StackNavBack, StackNavTitle } from "@/lib/stack-nav-context";
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

  if (session.publicationStatus !== "PUBLISHED" || !coachingSessionHasBody(session)) {
    notFound();
  }

  return (
    <AppStackPage>
      <StackNavTitle title={session.title} />
      <StackNavBack
        href={`/coaching/${session.entitlement.id}`}
        label={session.entitlement.coachingOffering.title}
      />

      <TabPageHeader
        eyebrow={`${session.sessionNo}회차`}
        title={session.title}
        description={session.summary ?? "코칭 회차 콘텐츠와 Q&A를 확인하세요."}
        variant="stack"
      />

      <header className="app-section">
        <CoachingCoachProfile coach={session.coach} />
      </header>

      <AppSection labelledBy="coaching-content-heading">
        <AppSectionHeader title="내용" titleId="coaching-content-heading" />
        <CoachingMarkdown body={session.bodyMarkdown} bodyMetadata={session.bodyMetadata} />
      </AppSection>

      <AppSection labelledBy="coaching-qna-heading">
        <AppSectionHeader
          title="Q&A"
          titleId="coaching-qna-heading"
          description="코치가 확인 후 답변을 남깁니다. 실시간 채팅이 아닙니다."
        />
        <CoachingSessionQnaPanel
          sessionId={session.id}
          coach={session.coach}
          messages={
            session.conversation?.messages.map((message) => ({
              id: message.id,
              authorRole: message.authorRole,
              authorName: message.author.name ?? message.author.email,
              authorAvatarUrl: message.authorRole === "COACH" ? session.coach.profile?.avatarUrl : null,
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
