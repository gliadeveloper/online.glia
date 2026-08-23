import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = privateSectionMetadata;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell userName={user.name ?? "Admin"} userEmail={user.email}>
      {children}
    </AdminShell>
  );
}
