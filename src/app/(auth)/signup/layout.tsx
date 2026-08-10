import { AuthLayoutRoot } from "@/components/auth/corporate-trust/auth-layout-root";
import { AuthLayoutShell } from "@/components/auth/corporate-trust/auth-layout-shell";

export default function SignupRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayoutRoot>
      <AuthLayoutShell>{children}</AuthLayoutShell>
    </AuthLayoutRoot>
  );
}
