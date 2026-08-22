import { GliaAuthRoot, GliaAuthShell } from "@/components/auth/glia/glia-auth-layout";

export default function LoginRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GliaAuthRoot>
      <GliaAuthShell>{children}</GliaAuthShell>
    </GliaAuthRoot>
  );
}
