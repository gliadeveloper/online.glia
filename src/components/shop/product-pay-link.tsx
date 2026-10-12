import Link from "next/link";

type ProductPayLinkProps = {
  productId: string;
  isLoggedIn: boolean;
  className?: string;
};

export function productCheckoutHref(productId: string, isLoggedIn: boolean) {
  const checkout = `/shop/${productId}/checkout`;
  if (isLoggedIn) return checkout;
  return `/login?next=${encodeURIComponent(checkout)}`;
}

export function ProductPayLink({ productId, isLoggedIn, className }: ProductPayLinkProps) {
  return (
    <Link href={productCheckoutHref(productId, isLoggedIn)} className={["shop-pdp-apply-btn", className].filter(Boolean).join(" ")}>
      결제하기
    </Link>
  );
}
