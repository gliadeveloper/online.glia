import { CommunityPostFeed } from "@/components/community/community-post-feed";
import { CommunityWriteFab } from "@/components/community/community-write-fab";
import { getPublishedPosts } from "@/lib/posts";
import { getCurrentUser } from "@/lib/session";

export default async function CommunityPage() {
  const [posts, user] = await Promise.all([getPublishedPosts(), getCurrentUser()]);

  return (
    <div className="community-screen">
      <h1 className="sr-only">커뮤니티</h1>

      <section className="community-feed" aria-label="게시글 목록">
        <CommunityPostFeed posts={posts} />
      </section>

      <CommunityWriteFab isLoggedIn={!!user} />
    </div>
  );
}
