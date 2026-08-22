type IconProps = {
  className?: string;
};

const svg = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function CourseIcon({ className }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className={className} {...svg}>
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

export function CoachingIcon({ className }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className={className} {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function LiveIcon({ className }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className={className} {...svg}>
      <circle cx={12} cy={12} r={2} />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </svg>
  );
}

export function CommentIcon({ className }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className={className} {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function SessionIcon({ className }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className={className} {...svg}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" className={className} {...svg}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" className={className} {...svg}>
      <circle cx={12} cy={8} r={3.5} />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}
