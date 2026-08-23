import type { Metadata } from "next";

import { CommunityPostFeed } from "@/components/community/community-post-feed";
import { CommunityPopularSidebar } from "@/components/community/community-popular-sidebar";
import { CommunityWriteFab } from "@/components/community/community-write-fab";
import { getPopularPostsThisWeek, getPublishedPosts } from "@/lib/posts";
import { getCurrentUser } from "@/lib/session";
import { buildPageMetadata, communityOgImages } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "커뮤니티",
  description: "회복 기록과 인증 글을 나누는 GLIA 커뮤니티.",
  path: "/community",
  images: communityOgImages,
});

import "@/components/community/community-glia.css";

export default async function CommunityPage() {
  const [posts, popularPosts, user] = await Promise.all([
    getPublishedPosts(),
    getPopularPostsThisWeek(),
    getCurrentUser(),
  ]);

  return (
    <div className="glia-community">
      <header className="glia-community__hero">
        <div className="glia-community__ambient" aria-hidden="true">
          <span className="glia-community__blob glia-community__blob--mint" />
          <span className="glia-community__blob glia-community__blob--blue" />
          <span className="glia-community__blob glia-community__blob--wash" />
        </div>

        <div className="glia-community__hero-copy">
          <p className="glia-community__eyebrow">
            <span className="glia-community__eyebrow-dot" aria-hidden="true" />
            Community
          </p>
          <h1 className="glia-community__title">회복을 함께 기록하는 공간</h1>
          <p className="glia-community__lede">
            자세, 호흡, 움직임 — 오늘 몸이 보내온 신호를 나누고 서로의 회복 루틴에서 배워요.
          </p>
        </div>
      </header>

      <div className="glia-community__layout">
        <CommunityPopularSidebar posts={popularPosts} />

        <div className="glia-community__main">
          <CommunityPostFeed posts={posts} />
        </div>
      </div>

      <CommunityWriteFab isLoggedIn={!!user} />
    </div>
  );
}
