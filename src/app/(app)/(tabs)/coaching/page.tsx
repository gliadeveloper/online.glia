import Link from "next/link";
import { Compass, LogIn } from "lucide-react";

import {
  CoachingEntitlementCard,
  coachingEntitlementCardProps,
} from "@/components/coaching/coaching-entitlement-card";
import { getUserCoachingEntitlements } from "@/lib/coaching-customer";
import { getCurrentUser } from "@/lib/session";

import "@/components/coaching/coaching-glia.css";

type CoachingStats = {
  active: number;
  completed: number;
  held: number;
};

function CoachingHero({ stats }: { stats?: CoachingStats }) {
  return (
    <header className="glia-coaching__hero">
      <div className="glia-coaching__ambient" aria-hidden="true">
        <span className="glia-coaching__blob glia-coaching__blob--mint" />
        <span className="glia-coaching__blob glia-coaching__blob--blue" />
        <span className="glia-coaching__blob glia-coaching__blob--wash" />
      </div>

      <div className="glia-coaching__hero-copy">
        <p className="glia-coaching__eyebrow">
          <span className="glia-coaching__eyebrow-dot" aria-hidden="true" />
          Coaching
        </p>
        <h1 className="glia-coaching__title">나만의 코칭 여정을 이어가요</h1>
        <p className="glia-coaching__lede">
          호흡, 정렬, 회복 — 코치와 함께 몸의 감각을 다시 맞춰 갑니다.
        </p>
      </div>

      {stats && (
        <dl className="glia-coaching__stats">
          <div className="glia-coaching__stat">
            <dt className="glia-coaching__stat-label">진행 중</dt>
            <dd className="glia-coaching__stat-value">{stats.active}</dd>
          </div>
          <div className="glia-coaching__stat">
            <dt className="glia-coaching__stat-label">완료</dt>
            <dd className="glia-coaching__stat-value">{stats.completed}</dd>
          </div>
          <div className="glia-coaching__stat">
            <dt className="glia-coaching__stat-label">보유</dt>
            <dd className="glia-coaching__stat-value">{stats.held}</dd>
          </div>
        </dl>
      )}
    </header>
  );
}

export default async function CoachingTabPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="glia-coaching">
        <CoachingHero />

        <div className="glia-coaching__body">
          <div className="glia-coaching__empty">
            <span className="glia-coaching__empty-icon" aria-hidden="true">
              <LogIn size={24} />
            </span>
            <p className="glia-coaching__empty-title">로그인하면 코칭 여정이 이어집니다</p>
            <p className="glia-coaching__empty-hint">
              보유 중인 코칭 상품과 회차를 한곳에서 확인하고 이어서 진행하세요.
            </p>
            <Link
              href="/login?next=%2Fcoaching"
              className="glia-coaching__btn glia-coaching__btn--primary"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const entitlements = await getUserCoachingEntitlements(user.id);
  const stats: CoachingStats = {
    active: entitlements.filter((item) => item.status === "ACTIVE").length,
    completed: entitlements.filter((item) => item.status === "COMPLETED").length,
    held: entitlements.length,
  };

  return (
    <div className="glia-coaching">
      <CoachingHero stats={stats} />

      <div className="glia-coaching__body">
        <section className="glia-coaching__section" aria-labelledby="coaching-product-list-heading">
          <header className="glia-coaching__section-head">
            <div>
              <h2 id="coaching-product-list-heading" className="glia-coaching__section-title">
                보유 코칭
              </h2>
              <p className="glia-coaching__section-caption">구매·등록된 코칭 상품</p>
            </div>
            {entitlements.length > 0 && (
              <p className="glia-coaching__section-count">{entitlements.length}개</p>
            )}
          </header>

          {entitlements.length === 0 ? (
            <div className="glia-coaching__empty">
              <span className="glia-coaching__empty-icon" aria-hidden="true">
                <Compass size={24} />
              </span>
              <p className="glia-coaching__empty-title">보유 중인 코칭 상품이 없습니다</p>
              <p className="glia-coaching__empty-hint">
                지금 몸에 필요한 회복 코칭을 찾아 여정을 시작해 보세요.
              </p>
              <Link href="/shop" className="glia-coaching__btn glia-coaching__btn--primary">
                코칭 상품 보기
              </Link>
            </div>
          ) : (
            <ul className="glia-coaching__list">
              {entitlements.map((entitlement) => (
                <CoachingEntitlementCard
                  key={entitlement.id}
                  {...coachingEntitlementCardProps(entitlement)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
