import localFont from "next/font/local";

import "./tokens.css";
import "./app-trust-tokens.css";

const plusJakarta = localFont({
  src: "../../fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-plus-jakarta",
  weight: "400 800",
  display: "swap",
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
