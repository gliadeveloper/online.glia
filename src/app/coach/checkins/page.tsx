import { CoachCheckInHub } from "@/components/coach/coach-checkin-hub";
import { requireCoach } from "@/lib/coach";
import { listCoachCheckInMembers } from "@/lib/coach-checkins";

export default async function CoachCheckInsPage() {
  const coach = await requireCoach();
  const members = await listCoachCheckInMembers(coach.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Check-ins</p>
        <h1 className="text-3xl font-semibold tracking-tight">체크인 열람</h1>
        <p className="mt-1 text-zinc-600">접근을 허용한 회원의 데일리·주간 체크인을 확인합니다.</p>
      </div>
      <CoachCheckInHub members={members} />
    </div>
  );
}
