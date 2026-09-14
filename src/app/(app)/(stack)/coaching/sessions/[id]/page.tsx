import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CoachingCoachProfile } from "@/components/coaching/coaching-coach-profile";
import { CoachingMarkdown } from "@/components/coaching/coaching-markdown";
import { CoachingSessionResponse } from "@/components/coaching/coaching-session-response";
import { PostMarkdown } from "@/components/community/post-markdown";
import { getBlockNoteBlocksFromMetadata } from "@/lib/blocknote-content";
import { getCoachingSessionForUser } from "@/lib/coaching";
import { markCoachingNotificationsRead } from "@/lib/home-notifications";
import { coachingSessionHasBody } from "@/lib/coaching-session-content";
import { StackNavBack, StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/coaching/coaching-stack-glia.css";

type CoachingSessionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ panel?: string }>;
};

export default async function CoachingSessionPage({ params, searchParams }: CoachingSessionPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/coaching");
  }

  const { id } = await params;
  const { panel } = await searchParams;
  const session = await getCoachingSessionForUser(id, user.id);

  if (session.publicationStatus !== "PUBLISHED" || !coachingSessionHasBody(session)) {
    notFound();
  }

  await markCoachingNotificationsRead(user.id, session.id);

  const blocks = getBlockNoteBlocksFromMetadata(session.bodyMetadata);
  const productTitle = session.entitlement.coachingOffering.title;

  return (
    <div className="glia-session">
      <StackNavTitle title={session.title} />
      <StackNavBack href={`/coaching/${session.entitlement.id}`} label={productTitle} />

      <article className="glia-session__article">
        <header className="glia-session__header">
          <div className="glia-session__tags">
            <p className="glia-session__eyebrow">
              <span className="glia-session__eyebrow-dot" aria-hidden="true" />
              {session.sessionNo}회차
            </p>
            <Link href={`/coaching/${session.entitlement.id}`} className="glia-session__product">
              {productTitle}
            </Link>
          </div>

          <h1 className="glia-session__title">{session.title}</h1>

          <div className="glia-session__byline">
            <CoachingCoachProfile coach={session.coach} />
          </div>

          {session.summary ? <p className="glia-session__lede">{session.summary}</p> : null}
        </header>

        <div className="glia-session__body">
          {blocks?.length ? (
            <CoachingMarkdown body={session.bodyMarkdown} bodyMetadata={session.bodyMetadata} />
          ) : (
            <PostMarkdown content={session.bodyMarkdown ?? ""} />
          )}
        </div>
      </article>

      <CoachingSessionResponse
        sessionId={session.id}
        coach={session.coach}
        initialPanel={panel === "qna" ? "qna" : "log"}
        logs={session.logs.map((log) => ({
          id: log.id,
          body: log.body,
          createdAt: log.createdAt.toISOString(),
        }))}
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
    </div>
  );
}
