import Link from "next/link";

import { CreateFormPanel } from "@/app/admin/forms/new/create-form-panel";
import { requireAdmin } from "@/lib/admin";

export default async function AdminNewFormPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/forms" className="text-sm font-medium text-violet-600">
          ← 폼 목록
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">새 폼 만들기</h1>
        <p className="mt-1 text-zinc-600">질문과 옵션을 구성하고 필요 시 즉시 발행합니다.</p>
      </div>
      <CreateFormPanel />
    </div>
  );
}
