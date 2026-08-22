import { displayCoachName, type CoachProfile } from "@/lib/coaching-display";

type CoachingCoachProfileProps = {
  coach: CoachProfile;
  caption?: string;
};

export function CoachingCoachProfile({ coach, caption = "담당 코치" }: CoachingCoachProfileProps) {
  const name = displayCoachName(coach);
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="glia-session__coach">
      <span className="glia-session__avatar" aria-hidden="true">
        {coach.profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.profile.avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      <div className="glia-session__coach-copy">
        <p className="glia-session__coach-name">{name}</p>
        <p className="glia-session__coach-role">{caption}</p>
      </div>
    </div>
  );
}
