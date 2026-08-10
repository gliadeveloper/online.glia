"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CommunityAvatar } from "@/components/community/community-avatar";
import { CommunityReportButton } from "@/components/community/community-report-button";
import { PostCommentComposer } from "@/components/community/post-comment-composer";
import { PostCommentLikeButton } from "@/components/community/post-comment-like-button";
import { formatPostRelativeTime } from "@/lib/post-content";
import { displayAuthorName, type PostCommentItem } from "@/lib/post-display";

type PostCommentItemViewProps = {
  postSlug: string;
  comment: PostCommentItem;
  liked: boolean;
  likedCommentIds: string[];
  isLoggedIn: boolean;
  viewerUserId?: string;
  depth?: 0 | 1;
};

export function PostCommentItemView({
  postSlug,
  comment,
  liked,
  likedCommentIds,
  isLoggedIn,
  viewerUserId,
  depth = 0,
}: PostCommentItemViewProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState(comment.bodyMarkdown);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canManage = !!viewerUserId && comment.user.id === viewerUserId;

  function handleSave() {
    if (body.trim().length < 1) {
      setError("댓글 내용을 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/posts/${postSlug}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "댓글 수정에 실패했습니다.");
        return;
      }

      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm("이 댓글을 삭제할까요?");
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/posts/${postSlug}/comments/${comment.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "댓글 삭제에 실패했습니다.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <article className={`community-comment-item${depth === 1 ? " community-comment-item--reply" : ""}`}>
      <CommunityAvatar user={comment.user} size="sm" />

      <div className="community-comment-item__body">
        <header className="community-comment-item__header">
          <p className="community-comment-item__author">{displayAuthorName(comment.user)}</p>
          <p className="community-comment-item__meta">
            <time dateTime={comment.createdAt.toISOString()}>
              {formatPostRelativeTime(comment.createdAt)}
            </time>
            {comment.editedAt && <span className="community-comment-item__edited"> · 수정됨</span>}
          </p>
          {canManage && !editing && (
            <div className="community-comment-item__manage">
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={pending}
                className="community-comment-item__manage-btn shell-focus-ring"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="community-comment-item__manage-btn community-comment-item__manage-btn--danger shell-focus-ring"
              >
                삭제
              </button>
            </div>
          )}
        </header>

        {editing ? (
          <div className="community-comment-item__edit">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={2000}
              disabled={pending}
              className="community-comment-inline__input corp-trust-focus shell-focus-ring"
            />
            <div className="community-comment-item__edit-actions">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="community-comment-item__save shell-focus-ring"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setBody(comment.bodyMarkdown);
                  setError(null);
                }}
                disabled={pending}
                className="community-comment-item__cancel shell-focus-ring"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="community-comment-item__text">{comment.bodyMarkdown}</p>
        )}

        {!editing && (
          <footer className="community-comment-item__footer">
            <PostCommentLikeButton
              postSlug={postSlug}
              commentId={comment.id}
              initialCount={comment.likeCount}
              initialLiked={liked}
              isLoggedIn={isLoggedIn}
            />
            {depth === 0 && isLoggedIn && (
              <button
                type="button"
                onClick={() => setReplying((value) => !value)}
                className="community-comment-item__reply-btn shell-focus-ring"
              >
                {replying ? "답글 취소" : "답글"}
              </button>
            )}
            <CommunityReportButton
              targetType="COMMENT"
              postSlug={postSlug}
              commentId={comment.id}
              isLoggedIn={isLoggedIn}
            />
          </footer>
        )}

        {replying && (
          <div className="community-comment-item__reply-form">
            <PostCommentComposer
              postSlug={postSlug}
              parentCommentId={comment.id}
              variant="inline"
              onSubmitted={() => {
                setReplying(false);
                router.refresh();
              }}
            />
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <ul className="community-comment-replies">
            {comment.replies.map((reply) => (
              <li key={reply.id}>
                <PostCommentItemView
                  postSlug={postSlug}
                  comment={reply}
                  liked={likedCommentIds.includes(reply.id)}
                  likedCommentIds={likedCommentIds}
                  isLoggedIn={isLoggedIn}
                  viewerUserId={viewerUserId}
                  depth={1}
                />
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="community-comment-item__error">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
