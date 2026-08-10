import { Plus_Jakarta_Sans } from "next/font/google";

import "./tokens.css";
import "./app-trust-tokens.css";
import "../checkin/check-in-hub.css";
import "../community/community.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type CorpTrustScopeProps = {
  children: React.ReactNode;
  className?: string;
};

/** Corporate Trust token + typography scope. Use `--embedded` for L3/content-only (no page bg). */
export function CorpTrustScope({ children, className = "" }: CorpTrustScopeProps) {
  return (
    <div className={`corp-trust corp-trust--embedded ${plusJakarta.variable} ${className}`.trim()}>
      {children}
    </div>
  );
}
