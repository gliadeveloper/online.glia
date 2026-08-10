import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { OrderList } from "@/components/orders/order-list";
import { getUserOrders } from "@/lib/orders";
import { StackNavTitle } from "@/lib/stack-nav-context";
import { getCurrentUser } from "@/lib/session";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/orders");
  }

  const orders = await getUserOrders(user.id);

  return (
    <AppStackPage>
      <StackNavTitle title="주문 내역" />

      <TabPageHeader
        eyebrow="Orders"
        title="구매"
        titleAccent="내역"
        description="결제한 상품과 주문 상태를 확인하세요."
        variant="stack"
      />

      <OrderList orders={orders} />
    </AppStackPage>
  );
}
