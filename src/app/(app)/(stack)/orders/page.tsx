import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { OrderList } from "@/components/orders/order-list";
import { getUserOrders } from "@/lib/orders";
import { tossFailureMessage } from "@/lib/payments/toss/verify";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

import "@/components/orders/orders-glia.css";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; code?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/orders");
  }

  const orders = await getUserOrders(user.id);
  const { payment, code } = await searchParams;

  return (
    <AppStackPage className="orders-page">
      <StackNavTitle title="주문 내역" />

      <div className="glia-orders">
        <header className="glia-orders__head">
          <p className="glia-orders__kicker">Orders</p>
          <h1 className="glia-orders__title">주문 내역</h1>
          <p className="glia-orders__lede">신청한 프로그램과 승인 상태를 확인하세요.</p>
        </header>

        {payment === "failed" ? <p className="glia-orders__notice">{tossFailureMessage(code)}</p> : null}

        <OrderList orders={orders} />
      </div>
    </AppStackPage>
  );
}
