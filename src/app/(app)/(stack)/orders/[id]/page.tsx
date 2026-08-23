import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { formatKrw } from "@/lib/customer-labels";
import { getUserOrder } from "@/lib/orders";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/orders/orders-glia.css";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchased?: string }>;
};

function itemKindLabel(kind: string) {
  if (kind === "COACHING_ACCESS") return "코칭";
  return "강의";
}

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
  const hasCourse = product?.items.some((item) => item.courseId);
  const hasCoaching = product?.items.some((item) => item.coachingOfferingId);

  return (
    <AppStackPage className="orders-page">
      <StackNavTitle title="주문 상세" />

      <div className="glia-orders">
        <header className="glia-orders__head">
          <p className="glia-orders__kicker">Order</p>
          <h1 className="glia-orders__title">주문 상세</h1>
          <p className="glia-orders__lede">{product?.title ?? "결제 정보와 포함 항목을 확인하세요."}</p>
        </header>

        {purchased === "1" && order.status === "PAID" ? (
          <p className="glia-orders__notice">승인이 완료되었습니다. 아래에서 수강·코칭을 시작하세요.</p>
        ) : null}
        {order.status === "PENDING" ? (
          <p className="glia-orders__notice">코치 승인 대기 중입니다. 승인 후 내 학습에서 수강을 시작할 수 있어요.</p>
        ) : null}
        {order.status === "CANCELLED" ? (
          <p className="glia-orders__notice">신청이 거절되었습니다. 상품 페이지에서 다시 신청할 수 있어요.</p>
        ) : null}

        <div className="glia-orders__detail">
          <div className="glia-orders__detail-top">
            <div>
              <h2 className="glia-orders__detail-title">{product?.title ?? "주문"}</h2>
              <p className="glia-orders__meta">
                {order.createdAt.toLocaleString("ko-KR")} · #{order.id.slice(0, 8)}
              </p>
            </div>
            <OrderStatusPill status={order.status} variant="glia" />
          </div>

          <p className="glia-orders__detail-price">{formatKrw(order.total)}</p>

          {product ? (
            <>
              <h3 className="glia-orders__section-title">포함 항목</h3>
              <ul className="glia-orders__items">
                {product.items.map((item) => (
                  <li key={item.id} className="glia-orders__item">
                    <p className="glia-orders__item-title">
                      {item.course?.title ?? item.coachingOffering?.title}
                    </p>
                    <p className="glia-orders__item-kind">{itemKindLabel(item.kind)}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="glia-orders__actions">
            {order.status === "PAID" && hasCourse ? (
              <Link href="/learning" className="glia-orders__btn glia-orders__btn--primary">
                내 학습으로
              </Link>
            ) : null}
            {order.status === "PAID" && hasCoaching ? (
              <Link href="/coaching" className="glia-orders__btn glia-orders__btn--ghost">
                코칭 보기
              </Link>
            ) : null}
            {order.status === "PENDING" && product ? (
              <Link href={`/shop/${product.id}`} className="glia-orders__btn glia-orders__btn--ghost">
                상품으로 돌아가기
              </Link>
            ) : null}
            <Link href="/orders" className="glia-orders__btn glia-orders__btn--ghost">
              목록
            </Link>
          </div>
        </div>
      </div>
    </AppStackPage>
  );
}
