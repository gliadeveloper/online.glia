import { formatPostRelativeTime } from "@/lib/post-content";
import { displayAuthorName, type PostAuthor } from "@/lib/post-display";

import { CommunityAvatar } from "./community-avatar";

type CommunityAuthorRowProps = {
  user: PostAuthor;
  publishedAt: Date;
  headline?: string | null;
};

export function CommunityAuthorRow({ user, publishedAt, headline }: CommunityAuthorRowProps) {
  const relativeTime = formatPostRelativeTime(publishedAt);

  return (
    <div className="community-author-row">
      <CommunityAvatar user={user} size="sm" />

      <div className="community-author-row__body">
        <div className="community-author-row__name-line">
          <span className="community-author-row__name">{displayAuthorName(user)}</span>
          {headline && <span className="community-author-row__badge">{headline}</span>}
          <time className="community-author-row__time" dateTime={publishedAt.toISOString()}>
            {relativeTime}
          </time>
        </div>
      </div>
    </div>
  );
}
