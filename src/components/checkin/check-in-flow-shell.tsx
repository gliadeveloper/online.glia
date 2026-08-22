import { CheckinShell } from "@/components/checkin/checkin-shell";

type CheckInFlowShellProps = {
  navTitle: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
  eyebrow?: string;
  titleAccent?: string;
  contentClassName?: string;
  variant?: "card" | "hub";
};

/** Check-in L3 — card for lists/reports, hub canvas for step forms. */
export function CheckInFlowShell({
  navTitle,
  title,
  description,
  children,
  hideHeader = false,
  eyebrow,
  titleAccent,
  contentClassName = "check-in-flow__content check-in-flow__content--panel",
  variant = "card",
}: CheckInFlowShellProps) {
  return (
    <CheckinShell navTitle={navTitle} variant={variant}>
      {!hideHeader && title ? (
        <header className="glia-ci__page-head">
          {eyebrow ? <p className="glia-ci-hero__eyebrow">{eyebrow}</p> : null}
          <h1 className="glia-ci__page-title">
            {titleAccent ? (
              <>
                {title} <em>{titleAccent}</em>
              </>
            ) : (
              title
            )}
          </h1>
          {description ? <p className="glia-ci__page-desc">{description}</p> : null}
        </header>
      ) : null}

      <div className={contentClassName}>{children}</div>
    </CheckinShell>
  );
}
