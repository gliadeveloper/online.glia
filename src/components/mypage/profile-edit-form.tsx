"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  TrustAlert,
  TrustButton,
  TrustField,
  TrustInput,
  TrustTextarea,
} from "@/components/corporate-trust/app-trust-ui";

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
        <legend className="trust-field__label text-base">기본 정보</legend>

        <TrustField label="이름" required>
          <TrustInput
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={50}
          />
        </TrustField>

        <TrustField label="한 줄 소개">
          <TrustInput
            type="text"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={100}
            placeholder="예: 프론트엔드 학습 중"
          />
        </TrustField>

        <TrustField label="소개">
          <TrustTextarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="간단한 자기소개를 입력하세요."
          />
        </TrustField>

        <TrustField label="프로필 이미지 URL">
          <TrustInput
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://"
          />
        </TrustField>
      </fieldset>

      {error && <TrustAlert tone="error">{error}</TrustAlert>}
      {success && <TrustAlert tone="success">프로필이 저장되었습니다.</TrustAlert>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <TrustButton type="button" variant="secondary" onClick={() => router.push("/mypage")}>
          취소
        </TrustButton>
        <TrustButton type="submit" variant="primary" disabled={loading}>
          {loading ? "저장 중..." : "저장"}
        </TrustButton>
      </div>
    </form>
  );
}
