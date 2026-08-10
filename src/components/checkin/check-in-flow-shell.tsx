import { AppStackPage } from "@/components/app";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { StackNavTitle } from "@/lib/stack-nav-context";

type CheckInFlowShellProps = {
  navTitle: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  children: React.ReactNode;
  contentClassName?: string;
  hideHeader?: boolean;
};

/** Check-in L3 pages — same elevated card + mobile full-bleed as the hub. */
export function CheckInFlowShell({
  navTitle,
  eyebrow,
  title,
  titleAccent,
  description,
  children,
  contentClassName = "check-in-flow__content check-in-flow__content--panel",
  hideHeader = false,
}: CheckInFlowShellProps) {
  return (
    <AppStackPage className="check-in-hub-page">
      <StackNavTitle title={navTitle} />

      <article className="check-in-hub-card">
        {!hideHeader ? (
          <TabPageHeader
            eyebrow={eyebrow}
            title={title}
            titleAccent={titleAccent}
            description={description}
            variant="stack"
            inCard
          />
        ) : null}

        <div className={contentClassName}>{children}</div>
      </article>
    </AppStackPage>
  );
}
