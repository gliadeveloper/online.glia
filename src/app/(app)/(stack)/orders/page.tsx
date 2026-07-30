import { redirect } from "next/navigation";

import { AppStackPage } from "@/components/app";
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
      <OrderList orders={orders} />
    </AppStackPage>
  );
}
