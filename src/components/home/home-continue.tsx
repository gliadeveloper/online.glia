import Link from "next/link";

import { ChevronIcon, CoachingIcon, CourseIcon } from "@/components/home/home-icons";
import type { HomeContinueCoaching, HomeContinueCourse } from "@/lib/home";

type HomeContinueProps = {
  course: HomeContinueCourse | null;
  coaching: HomeContinueCoaching | null;
};

export function HomeContinue({ course, coaching }: HomeContinueProps) {
  if (!course && !coaching) {
    return null;
  }

  return (
    <section className="glia-section" aria-labelledby="home-continue-heading">
      <header className="glia-section__header">
        <h2 id="home-continue-heading" className="glia-section__title">
          이어 학습하기
        </h2>
        <p className="glia-section__caption">멈춰 둔 리듬을 이어서</p>
      </header>

      <div className="glia-continue">
        {course && (
          <Link href={course.href} className="glia-continue-card">
            <span className="glia-continue-card__media" aria-hidden="true">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt="" />
              ) : (
                <span className="glia-continue-card__fallback">
                  <CourseIcon />
                </span>
              )}
            </span>
            <span className="glia-continue-card__body">
              <span className="glia-continue-card__eyebrow">수강 중</span>
              <span className="glia-continue-card__title">{course.title}</span>
              <span className="glia-continue-card__meta">{course.meta}</span>
              <span className="glia-progress" aria-label={`진도 ${course.progressPercent}%`}>
                <span className="glia-progress__bar" style={{ width: `${course.progressPercent}%` }} />
              </span>
            </span>
            <ChevronIcon className="glia-continue-card__chevron" />
          </Link>
        )}

        {coaching && (
          <Link href={coaching.href} className="glia-continue-card">
            <span className="glia-continue-card__media glia-continue-card__media--coaching" aria-hidden="true">
              <CoachingIcon />
            </span>
            <span className="glia-continue-card__body">
              <span className="glia-continue-card__eyebrow">마지막 코칭</span>
              <span className="glia-continue-card__title">{coaching.title}</span>
              <span className="glia-continue-card__meta">{coaching.meta}</span>
            </span>
            <ChevronIcon className="glia-continue-card__chevron" />
          </Link>
        )}
      </div>
    </section>
  );
}
