import Link from "next/link";

export function AuthBrandMark() {
  return (
    <Link
      href="/"
      className="auth-trust-focus inline-flex min-h-11 items-center gap-3 rounded-lg py-1 pr-2"
      aria-label="홈으로 이동"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_4px_14px_0_rgba(79,70,229,0.35)]"
        role="img"
        aria-label="온라인 글리아 로고"
      >
        <span className="text-sm font-extrabold tracking-tight text-white">G</span>
      </div>
      <div className="min-w-0">
        <span className="block text-sm font-bold tracking-tight text-slate-900">온라인 글리아</span>
        <span className="block text-xs font-medium text-slate-500">성장을 위한 코칭 플랫폼</span>
      </div>
    </Link>
  );
}

function AuthHeroContent() {
  return (
    <>
      <div
        className="auth-trust-blob -left-24 top-16 h-[28rem] w-[28rem] bg-indigo-400/30"
        aria-hidden="true"
      />
      <div
        className="auth-trust-blob right-0 top-1/3 h-80 w-80 bg-violet-400/25"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-lg">
        <p className="mb-4 inline-flex items-center rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm">
          Trusted coaching platform
        </p>
        <h2 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-slate-900 xl:text-5xl">
          성장을 위한{" "}
          <span className="auth-trust-gradient-text">온라인 코칭</span>
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
          강의 · 코칭 · 데일리 체크인을 한곳에서. 전문 코치와 함께 꾸준한 변화를 만들어 보세요.
        </p>

        <div className="auth-trust-float mt-12 perspective-[2000px]" aria-hidden="true">
          <div className="w-72 rotate-x-[5deg] rotate-y-[-12deg] transform rounded-xl border border-slate-100 bg-white p-5 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.15)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 6v12M6 12h12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">오늘의 체크인</p>
                <p className="text-xs text-slate-500">3초면 기록 완료</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="h-2 w-4/5 rounded-full bg-slate-100" />
              <div className="h-2 w-3/5 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function AuthMobileBackdrop() {
  return (
    <>
      <div
        className="auth-trust-blob pointer-events-none fixed -left-32 top-0 h-72 w-72 bg-indigo-300/35 lg:hidden"
        aria-hidden="true"
      />
      <div
        className="auth-trust-blob pointer-events-none fixed -right-20 bottom-24 h-64 w-64 bg-violet-300/30 lg:hidden"
        aria-hidden="true"
      />
    </>
  );
}

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-trust-frame relative flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <AuthMobileBackdrop />

      <aside className="relative hidden shrink-0 overflow-hidden lg:flex lg:h-full lg:w-[min(52%,44rem)] lg:flex-col lg:justify-center lg:px-12 xl:px-20">
        <AuthHeroContent />
      </aside>

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="shrink-0 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-4 lg:pt-10">
          <AuthBrandMark />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 lg:hidden">
            강의 · 코칭 · 데일리 체크인을 한곳에서 시작하세요.
          </p>
        </header>

        <main className="flex flex-1 flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-2">
          {children}
        </main>
      </div>
    </div>
  );
}
