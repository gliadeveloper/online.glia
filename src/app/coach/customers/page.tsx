import { CoachCustomerHub } from "@/components/coach/coach-customer-hub";
import { requireCoach } from "@/lib/coach";
import { listCoachCustomers } from "@/lib/coach-customers";

export default async function CoachCustomersPage() {
  const user = await requireCoach();
  const customers = await listCoachCustomers(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Customers</p>
        <h1 className="text-3xl font-semibold tracking-tight">고객 관리</h1>
        <p className="mt-1 text-zinc-600">
          내 코스 수강·코칭권 보유 회원을 한곳에서 확인합니다.
        </p>
      </div>

      <CoachCustomerHub customers={customers} />
    </div>
  );
}
