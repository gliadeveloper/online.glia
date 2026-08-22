import { AppStackPage } from "@/components/app";
import { StackNavTitle } from "@/lib/stack-nav-context";

import "@/components/checkin/checkin.css";

type CheckinShellProps = {
  navTitle: string;
  children: React.ReactNode;
  withFooter?: boolean;
  variant?: "card" | "hub";
};

/** Check-in stack chrome. Hub and step forms are a full-bleed GLIA surface; reports stay in the card. */
export function CheckinShell({
  navTitle,
  children,
  withFooter = false,
  variant = "card",
}: CheckinShellProps) {
  const isHub = variant === "hub";
  const pageClass = [
    "check-in-hub-page",
    "glia-ci-scope",
    isHub ? "glia-ci-hub" : "",
    isHub && withFooter ? "glia-ci-hub--with-footer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AppStackPage className={pageClass}>
      <StackNavTitle title={navTitle} />
      {isHub ? (
        children
      ) : (
        <article
          className={`check-in-hub-card${withFooter ? " check-in-hub-card--with-footer" : ""}`}
        >
          {children}
        </article>
      )}
    </AppStackPage>
  );
}
