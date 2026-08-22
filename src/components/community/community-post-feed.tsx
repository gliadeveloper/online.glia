import { CommunityPostCard } from "./community-post-card";
import type { PostListItem } from "@/lib/posts";

type CommunityPostFeedProps = {
  posts: PostListItem[];
};

export function CommunityPostFeed({ posts }: CommunityPostFeedProps) {
  const headingId = "community-post-feed-heading";

  return (
    <section aria-labelledby={headingId} className="glia-feed">
      <div className="glia-feed__head">
        <h2 id={headingId} className="glia-feed__title">
          최신 이야기
        </h2>
        {posts.length > 0 && (
          <p className="glia-feed__count">{posts.length.toLocaleString("ko-KR")}개의 글</p>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="glia-feed-empty">
          <span className="glia-feed-empty__icon">
            <FeatherIcon />
          </span>
          <p className="glia-feed-empty__title">아직 게시글이 없습니다</p>
          <p className="glia-feed-empty__hint">
            오른쪽 아래 버튼으로 첫 이야기를 남겨 보세요. 작은 기록이 회복의 시작이 됩니다.
          </p>
        </div>
      ) : (
        <div className="glia-feed__list">
          {posts.map((post) => (
            <CommunityPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

function FeatherIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <path d="M16 8L2 22M17.5 15H9" />
    </svg>
  );
}
