import Link from "next/link";

type CheckInHubFooterCtaProps = {
  href: string;
  label: string;
};

export function CheckInHubFooterCta({ href, label }: CheckInHubFooterCtaProps) {
  return (
    <div className="check-in-hub-footer-cta">
      <Link
        href={href}
        className="check-in-hub-footer-cta__btn corp-trust-btn-primary corp-trust-focus shell-focus-ring trust-btn"
      >
        {label}
      </Link>
    </div>
  );
}
