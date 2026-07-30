import Link from "next/link";

import { AppButtonLink, AppEmptyState, AppPanel } from "@/components/app";
import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { Typography } from "@/components/typography/typography";
import { formatKrw, productKindLabels } from "@/lib/customer-labels";
import type { UserOrder } from "@/lib/orders";

type OrderListProps = {
  orders: UserOrder[];
};

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <AppEmptyState
        message="아직 주문 내역이 없습니다."
        action={<AppButtonLink href="/shop">상품 둘러보기</AppButtonLink>}
      />
    );
  }

  return (
    <AppPanel flush className="app-list-panel">
      <ul className="app-list-panel__list">
        {orders.map((order) => {
          const titles = order.lines.map((line) => line.product.title).join(", ");
          const kinds = [...new Set(order.lines.map((line) => productKindLabels[line.product.kind]))].join(
            " · ",
          );

          return (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="app-list-row shell-focus-ring">
                <div className="app-list-row__inner app-list-row__inner--top">
                  <div className="min-w-0">
                    <Typography as="p" role="bodyCompact" weight="medium" color="primary">
                      {titles}
                    </Typography>
                    <Typography as="p" role="bodySecondary" color="secondary">
                      {order.createdAt.toLocaleString("ko-KR")}
                    </Typography>
                    <Typography as="p" role="caption" color="secondary">
                      {kinds}
                    </Typography>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
                      {formatKrw(order.total)}
                    </Typography>
                    <OrderStatusPill status={order.status} />
                  </div>
                </div>
                <span className="sr-only">주문 상세 보기</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppPanel>
  );
}
