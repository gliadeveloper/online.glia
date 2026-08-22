import { notFound, redirect } from "next/navigation";

import { CreatePostForm } from "@/components/community/create-post-form";
import { getChildPostParentBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/community/community-write-glia.css";

export const dynamic = "force-dynamic";

type CommunityNewPostPageProps = {
  searchParams: Promise<{ parent?: string }>;
};

export default async function CommunityNewPostPage({ searchParams }: CommunityNewPostPageProps) {
  const user = await getCurrentUser();
  const { parent: parentSlug } = await searchParams;

  if (!user) {
    const next = parentSlug ? `/community/new?parent=${parentSlug}` : "/community/new";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const parentPost = parentSlug ? await getChildPostParentBySlug(parentSlug) : null;

  if (parentSlug && !parentPost) {
    notFound();
  }

  const isChild = !!parentPost;

  return (
    <div className="glia-write">
      <StackNavTitle title={isChild ? "인증 글 작성" : "글 작성"} />

      <header className="glia-write__header">
        <p className="glia-write__eyebrow">
          <span className="glia-write__eyebrow-dot" aria-hidden="true" />
          Community
        </p>

        <h1 className="glia-write__title">{isChild ? "인증 글 작성" : "글 작성"}</h1>

        <p className="glia-write__lede">
          {isChild
            ? "원본 글에 이어지는 인증 기록을 Markdown으로 남겨 보세요."
            : "오늘의 회복 기록, 궁금한 점, 함께 나누고 싶은 후기를 Markdown으로 적어 보세요."}
        </p>
      </header>

      <CreatePostForm parentPost={parentPost ?? undefined} />
    </div>
  );
}
