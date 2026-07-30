import { Typography } from "@/components/typography/typography";

type UserAvatarProps = {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  label?: string;
};

function displayLabel(name: string | null, email: string) {
  return name?.trim() || email;
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
  label,
}: UserAvatarProps) {
  const display = label ?? displayLabel(name, email);
  const initial = display.slice(0, 1).toUpperCase();

  return (
    <span
      className={`user-avatar user-avatar--${size}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="user-avatar__image" />
      ) : (
        <Typography as="span" role="caption" weight="semibold" color="secondary">
          {initial}
        </Typography>
      )}
    </span>
  );
}
