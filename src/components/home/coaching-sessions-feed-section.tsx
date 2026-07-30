import {
  HomeFeedPanel,
  HomeFeedPanelHeader,
  HomeFeedPanelList,
  HomeFeedRow,
  HomeFeedRowMedia,
} from "@/components/home/home-feed-panel";
import { getSessionDisplayLabel } from "@/lib/coaching";
import { getUserCoachingSessionsForHomeFeed } from "@/lib/coaching-customer";

type CoachingSessionsFeedSectionProps = {
  userId: string;
  limit?: number;
};

function sessionSubtitle(session: Awaited<
  ReturnType<typeof getUserCoachingSessionsForHomeFeed>
>[number]) {
  const coachName = session.coach.name ?? session.coach.email;
  const statusLabel = getSessionDisplayLabel({
    publicationStatus: session.publicationStatus,
    scheduledAt: session.scheduledAt,
  });
  const pendingCount = session.conversation?.messages.length ?? 0;

  const parts = [`${session.sessionNo}회차`, coachName, statusLabel];
  if (pendingCount > 0) {
    parts.push(`답변 대기 ${pendingCount}`);
  }

  return parts.join(" · ");
}

export async function CoachingSessionsFeedSection({
  userId,
  limit = 5,
}: CoachingSessionsFeedSectionProps) {
  const sessions = await getUserCoachingSessionsForHomeFeed(userId, limit);

  if (sessions.length === 0) {
    return null;
  }

  const headingId = "home-coaching-sessions-heading";

  return (
    <HomeFeedPanel aria-labelledby={headingId}>
      <HomeFeedPanelHeader title="코칭 세션" titleId={headingId} moreHref="/coaching" />
      <HomeFeedPanelList>
        {sessions.map((session) => {
          const isPublished = session.publicationStatus === "PUBLISHED";
          const href = isPublished ? `/coaching/sessions/${session.id}` : "/coaching";

          return (
            <HomeFeedRow
              key={session.id}
              href={href}
              title={session.title}
              subtitle={sessionSubtitle(session)}
              navigateLabel={
                isPublished
                  ? `${session.title} — 코칭 세션으로 이동`
                  : `${session.title} — 코칭 목록으로 이동`
              }
              leading={
                <HomeFeedRowMedia label={String(session.sessionNo)} accent />
              }
            />
          );
        })}
      </HomeFeedPanelList>
    </HomeFeedPanel>
  );
}
