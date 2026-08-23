import type { Metadata } from "next";

import { CoachShell } from "@/components/coach/coach-shell";
import { requireCoach } from "@/lib/coach";
import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = privateSectionMetadata;

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCoach();

  return (
    <CoachShell userName={user.name ?? "Coach"} userEmail={user.email}>
      {children}
    </CoachShell>
  );
}
