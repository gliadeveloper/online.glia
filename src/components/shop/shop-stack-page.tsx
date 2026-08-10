import { AppStackPage } from "@/components/app";

type ShopStackPageProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shop stack pages — App shell L3 wrapper + Corporate Trust content scope.
 *
 * AdaptiveShell (#main-content)
 *   └─ ShopStackPage (= AppStackPage + shop-trust-content)
 *        ├─ StackNavTitle
 *        └─ shop UI (Corporate Trust styled)
 */
export function ShopStackPage({ children, className }: ShopStackPageProps) {
  return (
    <AppStackPage className={["shop-trust-content", className].filter(Boolean).join(" ")}>
      {children}
    </AppStackPage>
  );
}
