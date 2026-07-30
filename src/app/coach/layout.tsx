import { CoachShell } from "@/components/coach/coach-shell";
import { requireCoach } from "@/lib/coach";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCoach();

  return (
    <CoachShell userName={user.name ?? "Coach"} userEmail={user.email}>
      {children}
    </CoachShell>
  );
}
