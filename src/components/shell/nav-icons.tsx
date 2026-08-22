import { BookOpen, HeartPulse, Home, Users } from "lucide-react";

export type NavIconProps = {
  className?: string;
};

export function HomeIcon({ className }: NavIconProps) {
  return <Home className={className} strokeWidth={2} />;
}

export function CommunityIcon({ className }: NavIconProps) {
  return <Users className={className} strokeWidth={2} />;
}

export function LearningIcon({ className }: NavIconProps) {
  return <BookOpen className={className} strokeWidth={2} />;
}

export function CoachingIcon({ className }: NavIconProps) {
  return <HeartPulse className={className} strokeWidth={2} />;
}
