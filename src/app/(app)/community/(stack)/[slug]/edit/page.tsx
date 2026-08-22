import { notFound, redirect } from "next/navigation";

import { EditPostForm } from "@/components/community/edit-post-form";
import { getEditablePostBySlug } from "@/lib/posts";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/community/community-write-glia.css";

export const dynamic = "force-dynamic";

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
    <div className="glia-write">
      <StackNavTitle title="글 수정" />

      <header className="glia-write__header">
        <p className="glia-write__eyebrow">
          <span className="glia-write__eyebrow-dot" aria-hidden="true" />
          Community
        </p>

        <h1 className="glia-write__title">글 수정</h1>

        <p className="glia-write__lede">제목과 본문을 다듬은 뒤 저장하세요.</p>
      </header>

      <EditPostForm
        slug={post.slug}
        initialTitle={post.title}
        initialBodyMarkdown={post.bodyMarkdown}
      />
    </div>
  );
}
