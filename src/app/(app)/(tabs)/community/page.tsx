import { CommunityPostFeed } from "@/components/community/community-post-feed";
import { CommunityPopularSidebar } from "@/components/community/community-popular-sidebar";
import { CommunityWriteFab } from "@/components/community/community-write-fab";
import { getPopularPostsThisWeek, getPublishedPosts } from "@/lib/posts";
import { getCurrentUser } from "@/lib/session";

export default async function CommunityPage() {
  const [posts, popularPosts, user] = await Promise.all([
    getPublishedPosts(),
    getPopularPostsThisWeek(),
    getCurrentUser(),
  ]);

  return (
    <div className="community-screen">
      <h1 className="sr-only">커뮤니티</h1>

      <div className="community-layout">
        <main className="community-layout__main">
          <section className="community-feed" aria-label="게시글 목록">
            <CommunityPostFeed posts={posts} />
          </section>
        </main>

        <CommunityPopularSidebar posts={popularPosts} />
      </div>

      <CommunityWriteFab isLoggedIn={!!user} />
    </div>
  );
}
