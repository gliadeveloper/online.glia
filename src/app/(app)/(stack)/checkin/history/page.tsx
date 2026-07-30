import Link from "next/link";
import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { CheckInHistoryList } from "@/components/checkin/check-in-history-list";
import { Typography } from "@/components/typography/typography";
import { getCheckInHistoryPage } from "@/lib/checkin-hub";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type CheckInHistoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function CheckInHistoryPage({ searchParams }: CheckInHistoryPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/checkin/history");
  }

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const { items, total, pageSize } = await getCheckInHistoryPage(user.id, page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const historyItems = items.map((item) => ({
    id: item.id,
    href: item.href,
    title: item.title,
    subtitle: item.subtitle,
    done: true,
  }));

  return (
    <AppStackPage>
      <StackNavTitle title="작성한 목록" />

      <section aria-labelledby="check-in-history-page-heading">
        <Typography
          as="h1"
          id="check-in-history-page-heading"
          role="pageTitle"
          weight="semibold"
          color="primary"
          className="sr-only"
        >
          작성한 목록
        </Typography>

        <CheckInHistoryList
          labelledBy="check-in-history-page-heading"
          items={historyItems}
          emptyMessage="아직 작성한 기록이 없습니다."
          variant="page"
        />

        {totalPages > 1 && (
          <nav aria-label="페이지" className="check-in-history-pagination">
            {page > 1 ? (
              <Link
                href={`/checkin/history?page=${page - 1}`}
                className="check-in-history-pagination__btn shell-focus-ring"
              >
                <Typography as="span" role="bodySecondary" weight="medium" color="primary">
                  이전
                </Typography>
              </Link>
            ) : (
              <span className="check-in-history-pagination__btn check-in-history-pagination__btn--disabled">
                <Typography as="span" role="bodySecondary" weight="medium" color="disabled">
                  이전
                </Typography>
              </span>
            )}

            <Typography as="span" role="caption" color="secondary">
              {page} / {totalPages}
            </Typography>

            {page < totalPages ? (
              <Link
                href={`/checkin/history?page=${page + 1}`}
                className="check-in-history-pagination__btn shell-focus-ring"
              >
                <Typography as="span" role="bodySecondary" weight="medium" color="primary">
                  다음
                </Typography>
              </Link>
            ) : (
              <span className="check-in-history-pagination__btn check-in-history-pagination__btn--disabled">
                <Typography as="span" role="bodySecondary" weight="medium" color="disabled">
                  다음
                </Typography>
              </span>
            )}
          </nav>
        )}
      </section>
    </AppStackPage>
  );
}
