"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Typography } from "@/components/typography/typography";

type ProfileEditFormProps = {
  initial: {
    name: string;
    headline: string;
    bio: string;
    avatarUrl: string;
  };
};

export function ProfileEditForm({ initial }: ProfileEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, headline, bio, avatarUrl }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="typo-subTypography9 font-semibold text-[var(--color-text-primary)]">기본 정보</legend>

        <label className="block space-y-2 typo-subTypography11">
          <span className="font-medium text-[var(--color-text-primary)]">
            이름 <span aria-hidden="true">*</span>
            <span className="sr-only">(필수)</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={50}
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 typo-subTypography11 text-[var(--color-text-primary)]"
          />
        </label>

        <label className="block space-y-2 typo-subTypography11">
          <span className="font-medium text-[var(--color-text-primary)]">한 줄 소개</span>
          <input
            type="text"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={100}
            placeholder="예: 프론트엔드 학습 중"
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 typo-subTypography11 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
          />
        </label>

        <label className="block space-y-2 typo-subTypography11">
          <span className="font-medium text-[var(--color-text-primary)]">소개</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={500}
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 typo-subTypography11 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
            placeholder="간단한 자기소개를 입력하세요."
          />
        </label>

        <label className="block space-y-2 typo-subTypography11">
          <span className="font-medium text-[var(--color-text-primary)]">프로필 이미지 URL</span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://"
            className="shell-focus-ring w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 typo-subTypography11 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
          />
        </label>
      </fieldset>

      {error && (
        <div role="alert" className="app-feedback app-feedback--error">
          <Typography as="p" role="bodySecondary">
            {error}
          </Typography>
        </div>
      )}
      {success && (
        <div role="status" className="app-feedback app-feedback--success">
          <Typography as="p" role="bodySecondary">
            프로필이 저장되었습니다.
          </Typography>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/mypage")}
          className="app-btn app-btn--secondary shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            취소
          </Typography>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="app-btn app-btn--primary shell-focus-ring"
        >
          <Typography as="span" role="bodySecondary" weight="medium">
            {loading ? "저장 중..." : "저장"}
          </Typography>
        </button>
      </div>
    </form>
  );
}
