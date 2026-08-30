import { StackShell } from "@/components/shell/stack-shell";
import { getCurrentUser } from "@/lib/session";

export default async function StackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <StackShell isLoggedIn={!!user} userRole={user?.role}>
      {children}
    </StackShell>
  );
}
