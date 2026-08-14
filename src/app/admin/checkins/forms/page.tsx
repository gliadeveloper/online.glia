import Link from "next/link";

import { CheckInFormSetupPanel } from "@/app/admin/checkins/forms/check-in-form-setup-panel";
import { requireAdmin } from "@/lib/admin";
import { getCheckInFormsSetupStatus } from "@/lib/checkin-admin-setup";

export default async function AdminCheckInFormsPage() {
  await requireAdmin();
  const items = await getCheckInFormsSetupStatus();
  const allReady = items.every((item) => item.isReady);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/checkins" className="text-sm font-medium text-violet-600">
          ← 체크인 기록
        </Link>
        <p className="mt-3 text-sm font-medium text-violet-600">Check-in Forms</p>
        <h1 className="text-3xl font-semibold tracking-tight">체크인 폼 등록</h1>
        <p className="mt-1 text-zinc-600">
          데일리·주간 체크인에 사용할 폼을 등록하고 발행합니다. 고객 앱은 slug{" "}
          <code className="rounded bg-zinc-100 px-1 text-sm">daily-checkin</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 text-sm">weekly-checkin</code> 을 사용합니다.
        </p>
      </div>

      {!allReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          체크인 폼이 아직 준비되지 않았습니다. 아래에서 기본 템플릿을 등록하면 고객 화면에서
          바로 체크인할 수 있습니다.
        </div>
      )}

      <CheckInFormSetupPanel initialItems={items} />
    </div>
  );
}
