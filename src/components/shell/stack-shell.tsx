"use client";

import { AdaptiveShell } from "@/components/shell/adaptive-shell";
import { StackNavProvider } from "@/lib/stack-nav-context";

type StackShellProps = {
  isLoggedIn: boolean;
  children: React.ReactNode;
};

export function StackShell({ isLoggedIn, children }: StackShellProps) {
  return (
    <StackNavProvider>
      <AdaptiveShell mode="stack" isLoggedIn={isLoggedIn}>
        {children}
      </AdaptiveShell>
    </StackNavProvider>
  );
}
