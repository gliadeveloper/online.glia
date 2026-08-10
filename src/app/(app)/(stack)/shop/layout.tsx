import { ShopTrustScope } from "@/components/shop/shop-trust-root";

export default function ShopRouteLayout({ children }: { children: React.ReactNode }) {
  return <ShopTrustScope>{children}</ShopTrustScope>;
}
