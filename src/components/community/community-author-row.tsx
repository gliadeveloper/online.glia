import { Typography } from "@/components/typography/typography";
import { formatPostRelativeTime } from "@/lib/post-content";
import { displayAuthorName, type PostAuthor } from "@/lib/post-display";

import { CommunityAvatar } from "./community-avatar";

type CommunityAuthorRowProps = {
  user: PostAuthor;
  publishedAt: Date;
  headline?: string | null;
};

export function CommunityAuthorRow({ user, publishedAt, headline }: CommunityAuthorRowProps) {
  const meta = [formatPostRelativeTime(publishedAt), headline].filter(Boolean).join(" · ");

  return (
    <div className="community-author-row">
      <CommunityAvatar user={user} />
      <div className="community-author-row__body">
        <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
          {displayAuthorName(user)}
        </Typography>
        <Typography as="p" role="caption" color="secondary">
          <time dateTime={publishedAt.toISOString()}>{meta}</time>
        </Typography>
      </div>
    </div>
  );
}
