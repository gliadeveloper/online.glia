import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckInFlowShell } from "@/components/checkin/check-in-flow-shell";
import { CheckInHistoryList } from "@/components/checkin/check-in-history-list";
import { getCheckInHistoryPage } from "@/lib/checkin-hub";
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
    kind: item.kind,
    subtitle: item.subtitle,
    done: true,
  }));

  return (
    <CheckInFlowShell
      navTitle="작성한 목록"
      eyebrow="History"
      title="작성한"
      titleAccent="기록"
      description="지금까지 작성한 데일리·주간 체크인을 모아봅니다."
    >
      <section aria-labelledby="check-in-history-page-heading">
        <h1 id="check-in-history-page-heading" className="sr-only">
          작성한 목록
        </h1>

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
                이전
              </Link>
            ) : (
              <span className="check-in-history-pagination__btn check-in-history-pagination__btn--disabled">
                이전
              </span>
            )}

            <span>
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/checkin/history?page=${page + 1}`}
                className="check-in-history-pagination__btn shell-focus-ring"
              >
                다음
              </Link>
            ) : (
              <span className="check-in-history-pagination__btn check-in-history-pagination__btn--disabled">
                다음
              </span>
            )}
          </nav>
        )}
      </section>
    </CheckInFlowShell>
  );
}
