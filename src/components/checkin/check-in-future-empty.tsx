import Link from "next/link";
import { Calendar } from "lucide-react";

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
    <section className="check-in-state-page glia-ci-state" aria-labelledby="check-in-future-heading">
      <div className="check-in-state-page__body">
        <span className="glia-ci-icon glia-ci-icon--recovery" aria-hidden="true">
          <Calendar strokeWidth={2} size={24} />
        </span>
        <h1 id="check-in-future-heading" className="check-in-state-page__title">
          {title}
        </h1>
        <p className="check-in-state-page__description">{description}</p>
      </div>
      <div className="check-in-state-page__footer">
        <Link href={actionHref} className="check-in-state-page__action glia-ci-btn glia-ci-btn--primary">
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}
