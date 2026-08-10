"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Typography } from "@/components/typography/typography";
import { typoRoleClass } from "@/lib/typography";
import { resolveStackNav } from "@/lib/stack-nav";
import {
  useStackNavBackOverride,
  useStackNavTitleOverride,
  useStackNavTrailingLabel,
} from "@/lib/stack-nav-context";

/** Mobile stack: sole chrome — back + page title. */
export function BackNav() {
  const pathname = usePathname();
  const resolved = resolveStackNav(pathname);
  const { backHrefOverride, backLabelOverride } = useStackNavBackOverride();
  const backHref = backHrefOverride ?? resolved.backHref;
  const backLabel = backLabelOverride ?? resolved.backLabel;
  const { title, immersive } = resolved;
  const titleOverride = useStackNavTitleOverride();
  const trailingLabel = useStackNavTrailingLabel();
  const displayTitle = titleOverride ?? title;

  if (!displayTitle && !immersive) {
    return null;
  }

  if (immersive) {
    return (
      <nav
        id="context-nav"
        aria-label="이전 단계"
        data-slot="context-nav"
        className="check-in-step-chrome back-nav-trust back-nav-trust--immersive lg:hidden"
      >
        <div className="check-in-step-chrome__inner">
          <Link
            href={backHref}
            className={`check-in-step-chrome__back back-nav-trust__back shell-focus-ring ${typoRoleClass("bodySecondary")}`}
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            <span className="sr-only">{backLabel}</span>
          </Link>

          {trailingLabel ? (
            <Typography as="span" role="caption" color="secondary" className="check-in-step-chrome__step">
              {trailingLabel}
            </Typography>
          ) : (
            <span className="check-in-step-chrome__step-spacer" aria-hidden="true" />
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav
      id="context-nav"
      aria-label="이전 단계"
      data-slot="context-nav"
      className="back-nav-trust lg:hidden"
    >
      <div className="back-nav-trust__inner">
        <Link
          href={backHref}
          className={`back-nav-trust__back shell-focus-ring ${typoRoleClass("bodySecondary")}`}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          <span className="sr-only sm:not-sr-only">{backLabel}</span>
        </Link>

        <Typography
          as="h1"
          role="contextTitle"
          weight="semibold"
          color="primary"
          className="back-nav-trust__title min-w-0 flex-1 truncate text-center"
        >
          {displayTitle}
        </Typography>

        <span className="back-nav-trust__spacer" aria-hidden="true" />
      </div>
    </nav>
  );
}
