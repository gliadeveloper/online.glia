"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const previewName = name.trim() || "회원";
  const previewInitial = previewName.charAt(0);

  return (
    <form onSubmit={handleSubmit} className="glia-mypage__form">
      <div className="glia-mypage__preview" aria-hidden="true">
        <div className="glia-mypage__avatar">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            previewInitial
          )}
        </div>
        <div className="glia-mypage__identity">
          <p className="glia-mypage__name">{previewName}</p>
          {headline.trim() ? <p className="glia-mypage__headline">{headline}</p> : null}
        </div>
      </div>

      <fieldset className="glia-mypage__fieldset">
        <label className="glia-mypage__field">
          <span className="glia-mypage__label">
            이름 <span className="glia-mypage__req">필수</span>
          </span>
          <input
            className="glia-mypage__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={50}
          />
        </label>

        <label className="glia-mypage__field">
          <span className="glia-mypage__label">한 줄 소개</span>
          <input
            className="glia-mypage__input"
            type="text"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={100}
            placeholder="예: 호흡과 정렬을 기록하는 중"
          />
        </label>

        <label className="glia-mypage__field">
          <span className="glia-mypage__label">소개</span>
          <textarea
            className="glia-mypage__textarea"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="간단한 자기소개를 입력하세요."
          />
        </label>

        <label className="glia-mypage__field">
          <span className="glia-mypage__label">프로필 이미지 URL</span>
          <input
            className="glia-mypage__input"
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://"
          />
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="glia-mypage__alert glia-mypage__alert--error">
          {error}
        </p>
      ) : null}
      {success ? <p className="glia-mypage__alert glia-mypage__alert--ok">프로필이 저장되었습니다.</p> : null}

      <div className="glia-mypage__actions">
        <button type="submit" disabled={loading} className="glia-mypage__btn glia-mypage__btn--primary">
          {loading ? "저장 중…" : "저장"}
        </button>
        <button type="button" onClick={() => router.push("/mypage")} className="glia-mypage__btn glia-mypage__btn--ghost">
          취소
        </button>
      </div>
    </form>
  );
}
