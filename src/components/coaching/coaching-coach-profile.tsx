import { UserAvatar } from "@/components/ui/user-avatar";
import { Typography } from "@/components/typography/typography";
import { displayCoachName, type CoachProfile } from "@/lib/coaching-display";

type CoachingCoachProfileProps = {
  coach: CoachProfile;
  caption?: string;
};

export function CoachingCoachProfile({ coach, caption = "담당 코치" }: CoachingCoachProfileProps) {
  return (
    <div className="coaching-coach-profile">
      <UserAvatar
        name={coach.name}
        email={coach.email}
        avatarUrl={coach.profile?.avatarUrl}
        size="md"
      />
      <div className="coaching-coach-profile__body">
        <Typography as="p" role="caption" weight="medium" color="action">
          {caption}
        </Typography>
        <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
          {displayCoachName(coach)}
        </Typography>
      </div>
    </div>
  );
}
