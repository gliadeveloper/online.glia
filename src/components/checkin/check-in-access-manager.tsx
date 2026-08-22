"use client";

import { Search, ShieldAlert, ShieldOff, UserPlus, Users } from "lucide-react";
import { useState } from "react";

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
    <div className="glia-ci-identity">
      {coach.profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coach.profile.avatarUrl} alt="" className="glia-ci-avatar" />
      ) : (
        <span className="glia-ci-avatar" aria-hidden="true">
          {initial}
        </span>
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
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/checkin/access?q=${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as { results?: SearchCoach[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "검색에 실패했습니다.");
      setResults(data.results ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction?.coach.userId) return;
    const isGrant = pendingAction.kind === "grant";
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        isGrant
          ? "/api/checkin/access"
          : `/api/checkin/access/${encodeURIComponent(pendingAction.coach.userId)}`,
        isGrant
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coachUserId: pendingAction.coach.userId }),
            }
          : { method: "DELETE" },
      );
      const data =
        response.status === 204 ? null : ((await response.json()) as { error?: string });
      if (!response.ok) throw new Error(data?.error ?? "권한 변경에 실패했습니다.");

      if (isGrant) {
        const coach = pendingAction.coach;
        setActiveCoaches((current) => [
          { coach, grantedAt: new Date() },
          ...current.filter((item) => item.coach.id !== coach.id),
        ]);
        setResults((current) =>
          current.map((item) => (item.id === coach.id ? { ...item, accessGranted: true } : item)),
        );
        setMessage(`@${coach.userId} 코치에게 체크인 기록 접근을 허용했어요.`);
      } else {
        const coach = pendingAction.coach;
        setActiveCoaches((current) => current.filter((item) => item.coach.id !== coach.id));
        setResults((current) =>
          current.map((item) => (item.id === coach.id ? { ...item, accessGranted: false } : item)),
        );
        setMessage(`@${coach.userId} 코치의 접근을 차단했어요.`);
      }
      setPendingAction(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "권한 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const isGrantPending = pendingAction?.kind === "grant";

  return (
    <div className="glia-ci-hub__feed">
      <section className="glia-ci__section" aria-labelledby="coach-search-heading">
        <form className="glia-ci-search" onSubmit={search}>
          <div className="glia-ci-search__head">
            <span className="glia-ci-icon" aria-hidden="true">
              <Search strokeWidth={2} size={20} />
            </span>
            <div>
              <h2 id="coach-search-heading" className="glia-ci__section-title">
                코치 ID로 검색
              </h2>
              <p className="glia-ci__section-meta">허용할 코치의 아이디를 입력해 주세요.</p>
            </div>
          </div>
          <label htmlFor="coach-user-id" className="sr-only">
            코치 ID로 검색
          </label>
          <div className="glia-ci-search__row">
            <input
              id="coach-user-id"
              value={query}
              onChange={(event) => setQuery(event.target.value.toLowerCase())}
              placeholder="예: coach_kim"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button type="submit" disabled={loading} className="glia-ci-btn glia-ci-btn--primary">
              {loading ? "검색 중" : "검색"}
            </button>
          </div>
          {error ? (
            <p className="glia-ci-alert glia-ci-alert--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="glia-ci-alert glia-ci-alert--success" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </section>

      {results.length > 0 ? (
        <section className="glia-ci__section" aria-labelledby="coach-search-results">
          <h2 id="coach-search-results" className="glia-ci__section-title">
            검색 결과
          </h2>
          <ul className="glia-ci-coach-list">
            {results.map((coach) => (
              <li key={coach.id}>
                <CoachIdentity coach={coach} />
                {coach.accessGranted ? (
                  <span className="glia-ci-pill glia-ci-pill--done">허용 중</span>
                ) : (
                  <button
                    type="button"
                    className="glia-ci-btn glia-ci-btn--primary"
                    onClick={() => setPendingAction({ kind: "grant", coach })}
                  >
                    <UserPlus strokeWidth={2} size={16} aria-hidden="true" />
                    접근 허용
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : query && !loading ? (
        <section className="glia-ci__section">
          <p className="glia-ci-sharing__empty">일치하는 코치 ID가 없어요. ID를 다시 확인해 주세요.</p>
        </section>
      ) : null}

      <section className="glia-ci__section" aria-labelledby="active-coaches">
        <div className="glia-ci__section-head">
          <h2 id="active-coaches" className="glia-ci__section-title">
            접근 허용 중인 코치
          </h2>
          <span className="glia-ci__section-meta">{activeCoaches.length}명</span>
        </div>
        {activeCoaches.length ? (
          <ul className="glia-ci-coach-list">
            {activeCoaches.map(({ coach }) => (
              <li key={coach.id}>
                <CoachIdentity coach={coach} />
                <button
                  type="button"
                  className="glia-ci-btn glia-ci-btn--ghost"
                  onClick={() => setPendingAction({ kind: "revoke", coach })}
                >
                  접근 차단
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="glia-ci-sharing__empty">
            <span className="glia-ci-icon glia-ci-icon--info" aria-hidden="true">
              <Users strokeWidth={2} size={20} />
            </span>
            <p>아직 접근을 허용한 코치가 없어요.</p>
          </div>
        )}
      </section>

      {pendingAction ? (
        <div className="glia-ci-dialog-backdrop" role="presentation">
          <section
            className="glia-ci-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-dialog-title"
          >
            <span
              className={`glia-ci-icon${isGrantPending ? " glia-ci-icon--recovery" : ""}`}
              aria-hidden="true"
            >
              {isGrantPending ? (
                <ShieldAlert strokeWidth={2} size={20} />
              ) : (
                <ShieldOff strokeWidth={2} size={20} />
              )}
            </span>
            <h2 id="access-dialog-title">
              {isGrantPending
                ? `@${pendingAction.coach.userId}에게 접근을 허용할까요?`
                : `@${pendingAction.coach.userId}의 접근을 차단할까요?`}
            </h2>
            <p>
              {isGrantPending
                ? "이 코치는 이전에 작성한 기록과 앞으로 작성·수정할 데일리·주간 체크인 기록을 모두 볼 수 있습니다. 접근 권한은 내가 직접 차단할 때까지 유지됩니다."
                : "차단하면 이 코치는 내 과거 기록과 앞으로 작성할 체크인 기록을 더 이상 볼 수 없습니다."}
            </p>
            <div className="glia-ci-dialog__actions">
              <button
                type="button"
                className="glia-ci-btn glia-ci-btn--secondary"
                onClick={() => setPendingAction(null)}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="button"
                className="glia-ci-btn glia-ci-btn--primary"
                onClick={confirmAction}
                disabled={loading}
              >
                {loading ? "처리 중" : isGrantPending ? "접근 허용" : "접근 차단"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
