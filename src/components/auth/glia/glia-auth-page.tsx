import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type GliaAuthPageProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export function GliaAuthBackLink({ href, label = "뒤로" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="glia-auth__back">
      <ChevronLeft size={16} strokeWidth={2} className="glia-auth__back-icon" />
      {label}
    </Link>
  );
}

export function GliaAuthPage({
  eyebrow,
  title,
  titleAccent,
  description,
  backHref,
  backLabel,
  children,
}: GliaAuthPageProps) {
  return (
    <section className="glia-auth__panel">
      <header className="glia-auth__head">
        {backHref ? <GliaAuthBackLink href={backHref} label={backLabel} /> : null}

        <p className="glia-auth__eyebrow">
          <span className="glia-auth__eyebrow-dot" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="glia-auth__title">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="glia-auth__title-accent">{titleAccent}</span>
            </>
          ) : null}
        </h1>
        {description ? <p className="glia-auth__lede">{description}</p> : null}
      </header>

      <div className="glia-auth__body">{children}</div>
    </section>
  );
}
