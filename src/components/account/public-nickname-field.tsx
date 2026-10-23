"use client";

type PublicNicknameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  hintClassName?: string;
};

export function PublicNicknameField({
  value,
  onChange,
  disabled,
  className,
  labelClassName,
  inputClassName,
  hintClassName,
}: PublicNicknameFieldProps) {
  return (
    <label className={className}>
      <span className={labelClassName}>닉네임</span>
      <input
        className={inputClassName}
        type="text"
        autoComplete="nickname"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="커뮤니티에 보일 이름"
        maxLength={20}
        required
        disabled={disabled}
      />
      <span className={hintClassName}>글과 댓글에 이렇게 표시돼요. 실명과는 따로예요.</span>
    </label>
  );
}

export async function persistPublicNickname(nickname: string) {
  const response = await fetch("/api/me/nickname", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  const data = (await response.json()) as { error?: string; nickname?: string | null };
  if (!response.ok) {
    return { ok: false as const, error: data.error ?? "닉네임을 저장하지 못했습니다." };
  }
  return { ok: true as const, nickname: data.nickname ?? nickname.trim() };
}
