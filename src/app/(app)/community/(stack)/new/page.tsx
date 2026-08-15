import { notFound, redirect } from "next/navigation";

import { CreatePostForm } from "@/components/community/create-post-form";
import { getChildPostParentBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

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
    <div className="community-write-page">
      <StackNavTitle title={isChild ? "하위 글 작성" : "글 작성"} />

      <header className="community-write-page__header">
        <h1 className="community-write-page__title">{isChild ? "하위 글 작성" : "글 작성"}</h1>
        <p className="community-write-page__desc">
          {isChild
            ? "부모 글에 연결되는 Markdown 글을 작성합니다."
            : "Markdown으로 학습 노트·질문·후기를 공유하세요."}
        </p>
      </header>

      <CreatePostForm parentPost={parentPost ?? undefined} />
    </div>
  );
}
