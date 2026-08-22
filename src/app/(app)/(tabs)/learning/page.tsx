import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap } from "lucide-react";

import { EnrollmentCourseCard } from "@/components/learning/enrollment-course-card";
import { getUserEnrollments } from "@/lib/learning-enrollments";
import { getCurrentUser } from "@/lib/session";

import "@/components/learning/learning-glia.css";

type LearningPageProps = {
  searchParams: Promise<{ purchased?: string }>;
};

type LearningStats = {
  active: number;
  completed: number;
  averageProgress: number;
};

function LearningHero({ stats }: { stats?: LearningStats }) {
  return (
    <header className="glia-learning__hero">
      <div className="glia-learning__ambient" aria-hidden="true">
        <span className="glia-learning__blob glia-learning__blob--mint" />
        <span className="glia-learning__blob glia-learning__blob--blue" />
        <span className="glia-learning__blob glia-learning__blob--wash" />
      </div>

      <div className="glia-learning__hero-copy">
        <p className="glia-learning__eyebrow">
          <span className="glia-learning__eyebrow-dot" aria-hidden="true" />
          Learning
        </p>
        <h1 className="glia-learning__title">몸을 이해하는 학습을 이어가요</h1>
        <p className="glia-learning__lede">
          호흡, 정렬, 회복 — 오늘 학습한 만큼 몸의 감각이 또렷해집니다.
        </p>
      </div>

      {stats && (
        <dl className="glia-learning__stats">
          <div className="glia-learning__stat">
            <dt className="glia-learning__stat-label">수강 중</dt>
            <dd className="glia-learning__stat-value">{stats.active}</dd>
          </div>
          <div className="glia-learning__stat">
            <dt className="glia-learning__stat-label">수료</dt>
            <dd className="glia-learning__stat-value">{stats.completed}</dd>
          </div>
          <div className="glia-learning__stat">
            <dt className="glia-learning__stat-label">평균 진도</dt>
            <dd className="glia-learning__stat-value">{stats.averageProgress}%</dd>
          </div>
        </dl>
      )}
    </header>
  );
}

export default async function LearningPage({ searchParams }: LearningPageProps) {
  const user = await getCurrentUser();
  const { purchased } = await searchParams;

  if (!user) {
    return (
      <div className="glia-learning">
        <LearningHero />

        <div className="glia-learning__body">
          <div className="glia-learning__empty">
            <span className="glia-learning__empty-icon" aria-hidden="true">
              <GraduationCap size={24} />
            </span>
            <p className="glia-learning__empty-title">로그인하면 학습 기록이 이어집니다</p>
            <p className="glia-learning__empty-hint">
              수강 목록과 진도를 한곳에서 확인하고 멈춘 지점부터 다시 시작하세요.
            </p>
            <Link
              href="/login?next=%2Flearning"
              className="glia-learning__btn glia-learning__btn--primary"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const enrollments = await getUserEnrollments(user.id);
  const inProgress = enrollments.filter((item) => item.status === "ACTIVE");
  const completed = enrollments.filter((item) => item.status === "COMPLETED");
  const expired = enrollments.filter((item) => item.status === "EXPIRED");

  const stats: LearningStats = {
    active: inProgress.length,
    completed: completed.length,
    averageProgress:
      inProgress.length === 0
        ? 0
        : Math.round(
            inProgress.reduce((sum, item) => sum + item.progressPercent, 0) / inProgress.length,
          ),
  };

  return (
    <div className="glia-learning">
      <LearningHero stats={stats} />

      <div className="glia-learning__body">
        {purchased === "1" && (
          <p className="glia-learning__notice">
            <CheckCircle2 size={18} aria-hidden="true" />
            구매가 완료되었습니다. 첫 레슨부터 학습을 시작해 보세요.
          </p>
        )}

        <section className="glia-learning__section" aria-labelledby="learning-continue-heading">
          <header className="glia-learning__section-head">
            <div>
              <h2 id="learning-continue-heading" className="glia-learning__section-title">
                이어보기
              </h2>
              <p className="glia-learning__section-caption">현재 수강 중인 클래스</p>
            </div>
            {inProgress.length > 0 && (
              <p className="glia-learning__section-count">{inProgress.length}개</p>
            )}
          </header>

          {inProgress.length === 0 ? (
            <div className="glia-learning__empty">
              <span className="glia-learning__empty-icon" aria-hidden="true">
                <BookOpen size={24} />
              </span>
              <p className="glia-learning__empty-title">수강 중인 클래스가 없습니다</p>
              <p className="glia-learning__empty-hint">
                지금 몸에 필요한 회복 클래스를 찾아 학습을 시작해 보세요.
              </p>
              <Link href="/shop" className="glia-learning__btn glia-learning__btn--primary">
                클래스 둘러보기
              </Link>
            </div>
          ) : (
            <ul className="glia-learning__grid">
              {inProgress.map((enrollment) => (
                <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </ul>
          )}
        </section>

        <section className="glia-learning__section" aria-labelledby="learning-completed-heading">
          <header className="glia-learning__section-head">
            <div>
              <h2 id="learning-completed-heading" className="glia-learning__section-title">
                전체 목록
              </h2>
              <p className="glia-learning__section-caption">수강 완료한 클래스</p>
            </div>
            {completed.length > 0 && (
              <p className="glia-learning__section-count">{completed.length}개</p>
            )}
          </header>

          {completed.length === 0 ? (
            <div className="glia-learning__empty">
              <span className="glia-learning__empty-icon" aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <p className="glia-learning__empty-title">수강 완료한 클래스가 없습니다</p>
              <p className="glia-learning__empty-hint">
                한 클래스를 끝까지 마치면 이곳에 기록이 남습니다.
              </p>
            </div>
          ) : (
            <ul className="glia-learning__grid">
              {completed.map((enrollment) => (
                <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </ul>
          )}
        </section>

        {expired.length > 0 && (
          <section className="glia-learning__section" aria-labelledby="learning-expired-heading">
            <header className="glia-learning__section-head">
              <div>
                <h2 id="learning-expired-heading" className="glia-learning__section-title">
                  만료된 클래스
                </h2>
                <p className="glia-learning__section-caption">수강 기간이 지난 클래스</p>
              </div>
              <p className="glia-learning__section-count">{expired.length}개</p>
            </header>

            <ul className="glia-learning__grid">
              {expired.map((enrollment) => (
                <EnrollmentCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
