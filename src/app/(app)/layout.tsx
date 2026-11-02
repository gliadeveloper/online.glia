import { ContactPromptGate } from "@/components/account/contact-prompt-gate";
import { CorpTrustScope } from "@/components/corporate-trust/corp-trust-scope";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CorpTrustScope className="app-trust-root">
      {children}
      <ContactPromptGate />
    </CorpTrustScope>
  );
}
