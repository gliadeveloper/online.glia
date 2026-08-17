"use client";

import { useState } from "react";

import { TrustAlert, TrustButton, TrustInput } from "@/components/corporate-trust/app-trust-ui";

type Coach = {
  id: string;
  userId: string | null;
  name: string | null;
  profile: { avatarUrl: string | null; headline: string | null } | null;
};

type SearchCoach = Coach & { accessGranted: boolean };
type ActiveCoach = { coach: Coach; grantedAt: string | Date };

type PendingAction = { kind: "grant" | "revoke"; coach: Coach } | null;

function CoachIdentity({ coach }: { coach: Coach }) {
  const initial = (coach.name ?? coach.userId ?? "C").slice(0, 1).toUpperCase();
  return (
    <div className="check-in-access__identity">
      {coach.profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coach.profile.avatarUrl} alt="" className="check-in-access__avatar" />
      ) : (
        <span className="check-in-access__avatar check-in-access__avatar--fallback" aria-hidden="true">{initial}</span>
      )}
      <span>
        <strong>{coach.name ?? "이름 미설정 코치"}</strong>
        <small>@{coach.userId}</small>
        {coach.profile?.headline ? <em>{coach.profile.headline}</em> : null}
      </span>
    </div>
  );
}

export function CheckInAccessManager({ initialActiveCoaches }: { initialActiveCoaches: ActiveCoach[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCoach[]>([]);
  const [activeCoaches, setActiveCoaches] = useState(initialActiveCoaches);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      setError("코치 ID를 2자 이상 입력해 주세요.");
      return;
    }
    setLoading(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/checkin/access?q=${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as { results?: SearchCoach[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "검색에 실패했습니다.");
      setResults(data.results ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "검색에 실패했습니다.");
    } finally { setLoading(false); }
  }

  async function confirmAction() {
    if (!pendingAction?.coach.userId) return;
    const isGrant = pendingAction.kind === "grant";
    setLoading(true); setError(null);
    try {
      const response = await fetch(
        isGrant ? "/api/checkin/access" : `/api/checkin/access/${encodeURIComponent(pendingAction.coach.userId)}`,
        isGrant
          ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coachUserId: pendingAction.coach.userId }) }
          : { method: "DELETE" },
      );
      const data = response.status === 204 ? null : await response.json() as { error?: string };
      if (!response.ok) throw new Error(data?.error ?? "권한 변경에 실패했습니다.");

      if (isGrant) {
        const coach = pendingAction.coach;
        setActiveCoaches((current) => [{ coach, grantedAt: new Date() }, ...current.filter((item) => item.coach.id !== coach.id)]);
        setResults((current) => current.map((item) => item.id === coach.id ? { ...item, accessGranted: true } : item));
        setMessage(`@${coach.userId} 코치에게 체크인 기록 접근을 허용했어요.`);
      } else {
        const coach = pendingAction.coach;
        setActiveCoaches((current) => current.filter((item) => item.coach.id !== coach.id));
        setResults((current) => current.map((item) => item.id === coach.id ? { ...item, accessGranted: false } : item));
        setMessage(`@${coach.userId} 코치의 접근을 차단했어요.`);
      }
      setPendingAction(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "권한 변경에 실패했습니다.");
    } finally { setLoading(false); }
  }

  return (
    <div className="check-in-access">
      <section className="check-in-access__notice">
        <p>허용한 코치는 내가 직접 차단할 때까지, 이전 기록과 앞으로 작성·수정할 데일리·주간 체크인 기록을 모두 볼 수 있어요.</p>
      </section>

      <form className="check-in-access__search" onSubmit={search}>
        <label htmlFor="coach-user-id">코치 ID로 검색</label>
        <div><TrustInput id="coach-user-id" value={query} onChange={(event) => setQuery(event.target.value.toLowerCase())} placeholder="예: coach_kim" autoCapitalize="none" autoCorrect="off" /><TrustButton type="submit" disabled={loading}>{loading ? "검색 중" : "검색"}</TrustButton></div>
      </form>

      {error ? <TrustAlert tone="error">{error}</TrustAlert> : null}
      {message ? <TrustAlert tone="success">{message}</TrustAlert> : null}

      {results.length > 0 ? (
        <section className="check-in-access__section" aria-labelledby="coach-search-results">
          <h2 id="coach-search-results">검색 결과</h2>
          <ul className="check-in-access__list">
            {results.map((coach) => <li key={coach.id}><CoachIdentity coach={coach} /><TrustButton variant={coach.accessGranted ? "secondary" : "primary"} onClick={() => !coach.accessGranted && setPendingAction({ kind: "grant", coach })} disabled={coach.accessGranted}>{coach.accessGranted ? "허용 중" : "접근 허용"}</TrustButton></li>)}
          </ul>
        </section>
      ) : query && !loading ? <p className="check-in-access__empty">일치하는 코치 ID가 없어요. ID를 다시 확인해 주세요.</p> : null}

      <section className="check-in-access__section" aria-labelledby="active-coaches">
        <div className="check-in-access__section-head"><h2 id="active-coaches">접근 허용 중인 코치</h2><span>{activeCoaches.length}명</span></div>
        {activeCoaches.length ? <ul className="check-in-access__list">{activeCoaches.map(({ coach }) => <li key={coach.id}><CoachIdentity coach={coach} /><TrustButton variant="ghost" onClick={() => setPendingAction({ kind: "revoke", coach })}>접근 차단</TrustButton></li>)}</ul> : <p className="check-in-access__empty">아직 접근을 허용한 코치가 없어요.</p>}
      </section>

      {pendingAction ? (
        <div className="check-in-access__dialog-backdrop" role="presentation">
          <section className="check-in-access__dialog" role="dialog" aria-modal="true" aria-labelledby="access-dialog-title">
            <h2 id="access-dialog-title">{pendingAction.kind === "grant" ? `@${pendingAction.coach.userId}에게 접근을 허용할까요?` : `@${pendingAction.coach.userId}의 접근을 차단할까요?`}</h2>
            <p>{pendingAction.kind === "grant" ? "이 코치는 이전에 작성한 기록과 앞으로 작성·수정할 데일리·주간 체크인 기록을 모두 볼 수 있습니다. 접근 권한은 내가 직접 차단할 때까지 유지됩니다." : "차단하면 이 코치는 내 과거 기록과 앞으로 작성할 체크인 기록을 더 이상 볼 수 없습니다."}</p>
            <div><TrustButton variant="secondary" onClick={() => setPendingAction(null)} disabled={loading}>취소</TrustButton><TrustButton onClick={confirmAction} disabled={loading}>{loading ? "처리 중" : pendingAction.kind === "grant" ? "접근 허용" : "접근 차단"}</TrustButton></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
