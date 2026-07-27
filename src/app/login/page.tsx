import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <main className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm font-medium text-zinc-500">Glia Academy</p>
          <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
          <p className="text-sm text-zinc-500">강의 · 코칭 · 데일리 체크인</p>
        </div>

        <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
