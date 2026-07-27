import { redirect } from "next/navigation";

import { CustomerShell } from "@/components/customer/customer-shell";
import { getCurrentUser } from "@/lib/session";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <CustomerShell
      userName={user.name ?? "고객"}
      userEmail={user.email}
      userRole={user.role}
    >
      {children}
    </CustomerShell>
  );
}
