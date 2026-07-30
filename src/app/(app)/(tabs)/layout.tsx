import { TabShell } from "@/components/shell/tab-shell";
import { getCurrentUser } from "@/lib/session";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return <TabShell isLoggedIn={!!user}>{children}</TabShell>;
}
