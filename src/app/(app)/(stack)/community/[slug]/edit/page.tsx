import { notFound, redirect } from "next/navigation";

import { EditPostForm } from "@/components/community/edit-post-form";
import { getEditablePostBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type CommunityEditPostPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityEditPostPage({ params }: CommunityEditPostPageProps) {
  const user = await getCurrentUser();
  const { slug } = await params;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/community/${slug}/edit`)}`);
  }

  const post = await getEditablePostBySlug(slug, user.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="community-write-page">
      <StackNavTitle title="글 수정" />

      <header className="community-write-page__header">
        <h1 className="community-write-page__title">글 수정</h1>
        <p className="community-write-page__desc">제목과 본문을 수정한 뒤 저장하세요.</p>
      </header>

      <EditPostForm
        slug={post.slug}
        initialTitle={post.title}
        initialBodyMarkdown={post.bodyMarkdown}
      />
    </div>
  );
}
