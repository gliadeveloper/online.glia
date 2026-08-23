import Link from "next/link";

import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { formatKrw } from "@/lib/customer-labels";
import type { UserOrder } from "@/lib/orders";

type OrderListProps = {
  orders: UserOrder[];
};

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="glia-orders__empty">
        <p className="glia-orders__empty-title">아직 주문 내역이 없습니다</p>
        <p className="glia-orders__empty-hint">프로그램을 신청하면 이곳에서 상태를 확인할 수 있어요.</p>
        <Link href="/shop" className="glia-orders__btn glia-orders__btn--primary">
          상품 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <ul className="glia-orders__list">
      {orders.map((order) => {
        const titles = order.lines.map((line) => line.product.title).join(", ");

        return (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`} className="glia-orders__row">
              <div className="glia-orders__copy">
                <p className="glia-orders__name">{titles || "주문"}</p>
                <p className="glia-orders__meta">{order.createdAt.toLocaleString("ko-KR")}</p>
              </div>
              <div className="glia-orders__side">
                <p className="glia-orders__price">{formatKrw(order.total)}</p>
                <OrderStatusPill status={order.status} variant="glia" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
