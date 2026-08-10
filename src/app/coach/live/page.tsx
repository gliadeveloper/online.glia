import { CoachLiveScheduleList } from "@/components/coach/coach-live-schedule-list";
import { listCoachLiveLessons } from "@/lib/coach-live-lessons";
import { requireCoach } from "@/lib/coach";

export default async function CoachLivePage() {
  const user = await requireCoach();
  const lessons = await listCoachLiveLessons(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Coach Portal</p>
        <h1 className="text-3xl font-semibold tracking-tight">라이브</h1>
        <p className="mt-1 text-zinc-600">
          LIVE 레슨에 등록된 Zoom 링크를 확인하고 편집할 수 있습니다.
        </p>
      </div>

      <CoachLiveScheduleList lessons={lessons} />
    </div>
  );
}
