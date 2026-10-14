import Link from "next/link";

export function ProductRefundSection() {
  return (
    <section id="pdp-refund" className="glia-pdp__section" aria-labelledby="pdp-refund-heading">
      <h2 id="pdp-refund-heading" className="glia-pdp__section-title">
        취소 및 환불정책
      </h2>
      <p className="glia-pdp__muted">
        결제 전에 환불 기준을 확인해 주세요.{" "}
        <Link href="/legal/refund" className="glia-pdp__refund-link">
          취소 및 환불정책
        </Link>
      </p>
    </section>
  );
}
