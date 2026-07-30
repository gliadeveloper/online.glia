import { CoachLiveHub } from "@/components/coach/coach-live-hub";
import { listCoachLiveReplays, listCoachLiveSessions } from "@/lib/coach-live";
import { requireCoach } from "@/lib/coach";

export default async function CoachLivePage() {
  const user = await requireCoach();
  const [sessions, replays] = await Promise.all([
    listCoachLiveSessions(user.id),
    listCoachLiveReplays(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Coach Live</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">라이브 수업</h1>
        <p className="mt-1 text-sm text-zinc-500">
          라이브 진행 후 「종료 · 다시보기 생성」으로 VOD 변환합니다. 변환 완료 레슨은 아래에 표시됩니다.
        </p>
      </div>

      <CoachLiveHub initialSessions={sessions} initialReplays={replays} />
    </div>
  );
}
