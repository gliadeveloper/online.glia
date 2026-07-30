export type NavIconProps = {
  className?: string;
  filled?: boolean;
};

const SVG_BASE = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  "aria-hidden": true as const,
};

export function HomeIcon({ className, filled }: NavIconProps) {
  if (filled) {
    return (
      <svg {...SVG_BASE} className={className} fill="currentColor">
        <path d="M11.25 3.05a.75.75 0 0 1 .75 0l8.75 5.55A1.25 1.25 0 0 1 21 10.4V19.5A1.75 1.75 0 0 1 19.25 21.25H15v-5.5H9v5.5H4.75A1.75 1.75 0 0 1 3 19.5V10.4c0-.47.19-.92.52-1.25l7.73-6.1Z" />
      </svg>
    );
  }

  return (
    <svg
      {...SVG_BASE}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.75 12 4.25l8 6.5V19.75A1.25 1.25 0 0 1 18.75 21H15v-5.75H9V21H5.25A1.25 1.25 0 0 1 4 19.75v-9Z" />
    </svg>
  );
}

export function CommunityIcon({ className, filled }: NavIconProps) {
  if (filled) {
    return (
      <svg {...SVG_BASE} className={className} fill="currentColor">
        <path d="M8.5 11.25a2.75 2.75 0 1 0-.001-5.501A2.75 2.75 0 0 0 8.5 11.25ZM15.75 11.75a2.25 2.25 0 1 0-.001-4.501 2.25 2.25 0 0 0 .001 4.501Z" />
        <path d="M3.25 19.75c0-2.75 2.65-4.5 5.25-4.5 1.55 0 2.85.55 3.7 1.45.85-.9 2.15-1.45 3.7-1.45 2.6 0 5.25 1.75 5.25 4.5v.5H3.25v-.5Z" />
      </svg>
    );
  }

  return (
    <svg
      {...SVG_BASE}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 10.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M16 11.75a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M3.75 19.75v-.75a4.25 4.25 0 0 1 4.25-4.25H9" />
      <path d="M14.75 14.25a3.75 3.75 0 0 1 3.25 3.5v1.25" />
    </svg>
  );
}

export function LearningIcon({ className, filled }: NavIconProps) {
  if (filled) {
    return (
      <svg {...SVG_BASE} className={className} fill="currentColor">
        <path d="M11.28 2.86a.75.75 0 0 1 1.44 0l8.53 4.92a.75.75 0 0 1-.02 1.31l-8.51 4.65-8.51-4.65a.75.75 0 0 1-.02-1.31L11.28 2.86Z" />
        <path d="M4.5 10.58v5.67c0 1.34 2.95 2.75 7.5 2.75s7.5-1.41 7.5-2.75v-5.67L12 15.02 4.5 10.58Z" />
        <path d="M19.25 9.58v6.67c0 .72-.62 1.42-1.75 1.95V11.3l1.75-.72Z" />
      </svg>
    );
  }

  return (
    <svg
      {...SVG_BASE}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.25 7.75 12 3.25l7.75 4.5L12 12.25 4.25 7.75Z" />
      <path d="M6.25 10.25v5.25c0 .85 2.05 2 5.75 2s5.75-1.15 5.75-2v-5.25" />
      <path d="M19.75 8.75v6.5" />
    </svg>
  );
}
