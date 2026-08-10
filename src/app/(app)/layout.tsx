import { CorpTrustScope } from "@/components/corporate-trust/corp-trust-scope";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CorpTrustScope className="app-trust-root">{children}</CorpTrustScope>;
}
