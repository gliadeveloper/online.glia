"use client";

import { AdaptiveShell } from "@/components/shell/adaptive-shell";

type TabShellProps = {
  isLoggedIn: boolean;
  children: React.ReactNode;
};

export function TabShell({ isLoggedIn, children }: TabShellProps) {
  return (
    <AdaptiveShell mode="tab" isLoggedIn={isLoggedIn}>
      {children}
    </AdaptiveShell>
  );
}
