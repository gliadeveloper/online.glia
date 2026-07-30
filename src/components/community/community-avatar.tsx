import { Typography } from "@/components/typography/typography";
import { displayAuthorName, type PostAuthor } from "@/lib/post-display";

type CommunityAvatarProps = {
  user: Pick<PostAuthor, "name" | "email">;
  size?: "sm" | "md";
};

export function CommunityAvatar({ user, size = "md" }: CommunityAvatarProps) {
  const label = displayAuthorName(user);
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <span
      className={`community-avatar community-avatar--${size}`}
      aria-hidden="true"
    >
      <Typography as="span" role="caption" weight="semibold" color="secondary">
        {initial}
      </Typography>
    </span>
  );
}
