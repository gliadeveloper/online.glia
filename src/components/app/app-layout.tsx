import Link from "next/link";

import { Typography } from "@/components/typography/typography";

type AppTabScreenProps = {
  title: string;
  header?: React.ReactNode;
  children: React.ReactNode;
};

/** Tab root pages — full-bleed surface (community / learning tab pattern). */
export function AppTabScreen({ title, header, children }: AppTabScreenProps) {
  return (
    <div className="app-tab-screen">
      <h1 className="sr-only">{title}</h1>
      {header}
      <div className="app-tab-screen__surface">
        <div className="app-tab-screen__body">{children}</div>
      </div>
    </div>
  );
}

type AppStackPageProps = {
  children: React.ReactNode;
  className?: string;
};

/** Stack drill-down pages — consistent spacing + full-bleed on mobile. */
export function AppStackPage({ children, className }: AppStackPageProps) {
  return (
    <div className={["app-stack-page", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

type AppSectionProps = {
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
};

export function AppSection({ children, labelledBy, className }: AppSectionProps) {
  return (
    <section aria-labelledby={labelledBy} className={["app-section", className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
}

type AppPanelProps = {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
};

export function AppPanel({ children, className, flush }: AppPanelProps) {
  return (
    <div className={["app-panel", flush ? "app-panel--flush" : "app-panel--padded", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

type AppEmptyStateProps = {
  message: string;
  action?: React.ReactNode;
};

export function AppEmptyState({ message, action }: AppEmptyStateProps) {
  return (
    <AppPanel className="app-empty">
      <Typography as="p" role="bodySecondary" color="secondary">
        {message}
      </Typography>
      {action}
    </AppPanel>
  );
}

type AppStatusBannerProps = {
  children: React.ReactNode;
};

export function AppStatusBanner({ children }: AppStatusBannerProps) {
  return (
    <Typography as="p" role="bodySecondary" color="primary" className="app-status-banner">
      {children}
    </Typography>
  );
}

type AppSectionHeaderProps = {
  title: string;
  titleId: string;
  description?: string;
  action?: React.ReactNode;
};

export function AppSectionHeader({ title, titleId, description, action }: AppSectionHeaderProps) {
  return (
    <header className="app-section-header">
      <div className="app-section-header__body">
        <Typography as="h2" id={titleId} role="sectionTitle" weight="semibold" color="primary">
          {title}
        </Typography>
        {description && (
          <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
            {description}
          </Typography>
        )}
      </div>
      {action}
    </header>
  );
}

type AppButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function AppButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: AppButtonLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "corp-trust-focus shell-focus-ring trust-btn",
        variant === "primary" ? "corp-trust-btn-primary" : "corp-trust-btn-secondary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}

type AppStackBackLinkProps = {
  href: string;
  children: React.ReactNode;
};

export function AppStackBackLink({ href, children }: AppStackBackLinkProps) {
  return (
    <Link href={href} className="app-stack-back corp-trust-link corp-trust-focus shell-focus-ring">
      {children}
    </Link>
  );
}

type AppFootnoteProps = {
  children: React.ReactNode;
};

export function AppFootnote({ children }: AppFootnoteProps) {
  return (
    <Typography as="p" role="bodySecondary" color="secondary" className="app-footnote">
      {children}
    </Typography>
  );
}
