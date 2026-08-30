import { Typography } from "@/components/typography/typography";
import { displayAuthorName, type PostAuthor } from "@/lib/post-display";
import { profileAvatarSrc } from "@/lib/profile-avatar";

type CommunityAvatarProps = {
  user: Pick<PostAuthor, "name" | "email"> & {
    profile?: { avatarUrl?: string | null } | null;
  };
  size?: "sm" | "md";
};

export function CommunityAvatar({ user, size = "md" }: CommunityAvatarProps) {
  const label = displayAuthorName(user);
  const initial = label.slice(0, 1).toUpperCase();
  const src = profileAvatarSrc(user.profile?.avatarUrl);

  return (
    <span
      className={`community-avatar community-avatar--${size}`}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Typography as="span" role="caption" weight="semibold" color="secondary">
          {initial}
        </Typography>
      )}
    </span>
  );
}
