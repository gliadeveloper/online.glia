import { CorpTrustScope } from "@/components/corporate-trust/corp-trust-scope";

import "../corporate-trust/tokens.css";
import "./shop-tokens.css";

/** Shop route scope — Corporate Trust tokens + typography only. Shell/chrome is AppStackPage. */
export function ShopTrustScope({ children }: { children: React.ReactNode }) {
  return <CorpTrustScope>{children}</CorpTrustScope>;
}
