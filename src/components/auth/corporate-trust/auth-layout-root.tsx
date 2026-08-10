import { Plus_Jakarta_Sans } from "next/font/google";

import "./auth-tokens.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export function AuthLayoutRoot({ children }: { children: React.ReactNode }) {
  return <div className={`auth-trust ${plusJakarta.variable} min-h-dvh`}>{children}</div>;
}
