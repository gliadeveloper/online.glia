import { notFound, redirect } from "next/navigation";

import { AppPanel, AppStackBackLink, AppStackPage } from "@/components/app";
import { CreatePostForm } from "@/components/community/create-post-form";
import { Typography } from "@/components/typography/typography";
import { getPublishedPostSummaryBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

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

  const parentPost = parentSlug ? await getPublishedPostSummaryBySlug(parentSlug) : null;

  if (parentSlug && !parentPost) {
    notFound();
  }

  const isChild = !!parentPost;

  return (
    <AppStackPage>
      <StackNavTitle title={isChild ? "하위 글 작성" : "글 작성"} />

      <AppStackBackLink href={isChild ? `/community/${parentPost.slug}` : "/community"}>
        {isChild ? "← 부모 글로" : "← 커뮤니티 목록"}
      </AppStackBackLink>

      <header className="app-section">
        <Typography as="h1" role="pageTitle" weight="semibold" color="primary">
          {isChild ? "하위 글 작성" : "글 작성"}
        </Typography>
        <Typography as="p" role="bodySecondary" color="secondary">
          {isChild
            ? "부모 글에 연결되는 새 글을 Markdown으로 작성합니다."
            : "Markdown으로 학습 노트·질문·후기를 공유하세요."}
        </Typography>
      </header>

      <AppPanel>
        <CreatePostForm parentPost={parentPost ?? undefined} />
      </AppPanel>
    </AppStackPage>
  );
}
