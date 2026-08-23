import { AppStackPage } from "@/components/app";

type ShopStackPageProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shop stack pages — App shell L3 wrapper.
 *
 * AdaptiveShell (#main-content)
 *   └─ ShopStackPage (= AppStackPage + shop-trust-content)
 *        ├─ /shop      `.glia-shop` (GLIA catalog)
 *        └─ /shop/[id] `.glia-pdp` (GLIA product detail)
 */
export function ShopStackPage({ children, className }: ShopStackPageProps) {
  return (
    <AppStackPage className={["shop-trust-content", className].filter(Boolean).join(" ")}>
      {children}
    </AppStackPage>
  );
}
