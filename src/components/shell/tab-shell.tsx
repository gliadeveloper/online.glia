"use client";

import type { UserRole } from "@/generated/prisma/client";

import { AdaptiveShell } from "@/components/shell/adaptive-shell";

type TabShellProps = {
  isLoggedIn: boolean;
  userRole?: UserRole | null;
  children: React.ReactNode;
};

export function TabShell({ isLoggedIn, userRole, children }: TabShellProps) {
  return (
    <AdaptiveShell mode="tab" isLoggedIn={isLoggedIn} userRole={userRole}>
      {children}
    </AdaptiveShell>
  );
}
