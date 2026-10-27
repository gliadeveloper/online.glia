import Link from "next/link";

type ProductPayLinkProps = {
  productId: string;
  isLoggedIn: boolean;
  className?: string;
  label?: string;
};

export function productCheckoutHref(productId: string, isLoggedIn: boolean) {
  const checkout = `/shop/${productId}/checkout`;
  if (isLoggedIn) return checkout;
  return `/login?next=${encodeURIComponent(checkout)}`;
}

export function ProductPayLink({
  productId,
  isLoggedIn,
  className,
  label = "결제하기",
}: ProductPayLinkProps) {
  return (
    <Link href={productCheckoutHref(productId, isLoggedIn)} className={["shop-pdp-apply-btn", className].filter(Boolean).join(" ")}>
      {label}
    </Link>
  );
}
