import { notFound, redirect } from "next/navigation";

import {
  AppButtonLink,
  AppPanel,
  AppStackBackLink,
  AppStackPage,
  AppStatusBanner,
} from "@/components/app";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { Typography } from "@/components/typography/typography";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import { getUserOrder } from "@/lib/orders";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchased?: string }>;
};

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/orders");
  }

  const { id } = await params;
  const { purchased } = await searchParams;

  const order = await getUserOrder(user.id, id);
  if (!order) {
    notFound();
  }

  const product = order.lines[0]?.product;

  return (
    <AppStackPage>
      <StackNavTitle title="주문 상세" />

      <AppStackBackLink href="/orders">← 주문 내역</AppStackBackLink>

      {purchased === "1" && (
        <AppStatusBanner>결제가 완료되었습니다. 아래에서 수강·코칭 이용을 시작하세요.</AppStatusBanner>
      )}

      <AppPanel>
        <div className="app-list-row__inner app-list-row__inner--top">
          <div className="min-w-0">
            <Typography as="h1" role="pageTitle" weight="semibold" color="primary">
              {product?.title ?? "주문"}
            </Typography>
            <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
              {order.createdAt.toLocaleString("ko-KR")} · #{order.id.slice(0, 8)}
            </Typography>
          </div>
          <OrderStatusPill status={order.status} />
        </div>

        <Typography as="p" role="sectionTitle" weight="semibold" color="primary" className="app-section">
          {formatKrw(order.total)}
        </Typography>

        {product && (
          <div className="app-section">
            <Typography as="h2" role="label" weight="medium" color="secondary">
              포함 항목
            </Typography>
            <ul className="app-section">
              {product.items.map((item) => (
                <li key={item.id} className="app-panel app-panel--padded">
                  <Typography as="p" role="bodySecondary" weight="medium" color="primary">
                    {item.course?.title ?? item.coachingOffering?.title}
                  </Typography>
                  <Typography as="p" role="caption" color="secondary">
                    {item.kind}
                  </Typography>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="app-card__footer">
          {product?.items.some((item) => item.courseId) && (
            <AppButtonLink href="/learning">내 학습으로</AppButtonLink>
          )}
          {product?.items.some((item) => item.coachingOfferingId) && (
            <AppButtonLink href="/coaching" variant="secondary">
              코칭 예약
            </AppButtonLink>
          )}
          {product && (
            <Typography as="span" role="caption" color="secondary" className="self-center">
              {productKindLabels[product.kind]}
            </Typography>
          )}
        </div>
      </AppPanel>
    </AppStackPage>
  );
}
