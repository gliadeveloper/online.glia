import { TrustButtonLink } from "@/components/corporate-trust/app-trust-ui";

type CheckInFutureEmptyProps = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

export function CheckInFutureEmpty({
  title,
  description,
  actionHref,
  actionLabel,
}: CheckInFutureEmptyProps) {
  return (
    <section className="check-in-state-page" aria-labelledby="check-in-future-heading">
      <div className="check-in-state-page__body">
        <div className="check-in-state-page__icon" aria-hidden="true">
          <svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={3} y={4} width={18} height={18} rx={2} />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>

        <h1 id="check-in-future-heading" className="check-in-state-page__title">
          {title}
        </h1>

        <p className="check-in-state-page__description">{description}</p>
      </div>

      <div className="check-in-state-page__footer">
        <TrustButtonLink href={actionHref} className="check-in-state-page__action">
          {actionLabel}
        </TrustButtonLink>
      </div>
    </section>
  );
}
