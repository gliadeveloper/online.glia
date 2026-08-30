"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  ALLOWED_AVATAR_IMAGE_TYPES,
  MAX_AVATAR_IMAGE_BYTES,
} from "@/lib/media/avatar-image-constants";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, headline, bio }),
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

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_AVATAR_IMAGE_TYPES.has(file.type)) {
      setError("jpeg, png, webp 이미지만 올릴 수 있습니다.");
      return;
    }

    if (file.size > MAX_AVATAR_IMAGE_BYTES) {
      setError("이미지는 5MB 이하만 올릴 수 있습니다.");
      return;
    }

    setError(null);
    setSuccess(false);
    setAvatarBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/me/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { publicUrl?: string; error?: string };
      if (!response.ok || !data.publicUrl) {
        setError(data.error ?? "사진 업로드에 실패했습니다.");
        return;
      }

      setAvatarUrl(data.publicUrl);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    if (!avatarUrl) return;
    if (!window.confirm("프로필 사진을 삭제할까요?")) return;

    setError(null);
    setSuccess(false);
    setAvatarBusy(true);

    try {
      const response = await fetch("/api/me/profile/avatar", { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "사진 삭제에 실패했습니다.");
        return;
      }

      setAvatarUrl("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setAvatarBusy(false);
    }
  }

  const previewName = name.trim() || "회원";
  const previewInitial = previewName.charAt(0);
  const busy = loading || avatarBusy;

  return (
    <form onSubmit={handleSubmit} className="glia-mypage__form">
      <div className="glia-mypage__photo">
        <div className="glia-mypage__avatar" aria-hidden="true">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            previewInitial
          )}
        </div>
        <div className="glia-mypage__photo-copy">
          <p className="glia-mypage__label">프로필 사진</p>
          <p className="glia-mypage__photo-hint">JPG, PNG, WEBP · 5MB 이하</p>
          <div className="glia-mypage__photo-actions">
            <button
              type="button"
              className="glia-mypage__btn glia-mypage__btn--ghost"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarBusy ? "처리 중…" : avatarUrl ? "사진 바꾸기" : "사진 올리기"}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                className="glia-mypage__btn glia-mypage__btn--ghost"
                disabled={busy}
                onClick={handleAvatarDelete}
              >
                삭제
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="glia-mypage__file"
          onChange={handleAvatarChange}
        />
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
      </fieldset>

      {error ? (
        <p role="alert" className="glia-mypage__alert glia-mypage__alert--error">
          {error}
        </p>
      ) : null}
      {success ? <p className="glia-mypage__alert glia-mypage__alert--ok">프로필이 저장되었습니다.</p> : null}

      <div className="glia-mypage__actions">
        <button type="submit" disabled={busy} className="glia-mypage__btn glia-mypage__btn--primary">
          {loading ? "저장 중…" : "저장"}
        </button>
        <button type="button" onClick={() => router.push("/mypage")} className="glia-mypage__btn glia-mypage__btn--ghost">
          취소
        </button>
      </div>
    </form>
  );
}
