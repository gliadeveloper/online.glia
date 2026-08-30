"use client";

import type { UserRole } from "@/generated/prisma/client";

import { AdaptiveShell } from "@/components/shell/adaptive-shell";
import { StackNavProvider } from "@/lib/stack-nav-context";

type StackShellProps = {
  isLoggedIn: boolean;
  userRole?: UserRole | null;
  children: React.ReactNode;
};

export function StackShell({ isLoggedIn, userRole, children }: StackShellProps) {
  return (
    <StackNavProvider>
      <AdaptiveShell mode="stack" isLoggedIn={isLoggedIn} userRole={userRole}>
        {children}
      </AdaptiveShell>
    </StackNavProvider>
  );
}
