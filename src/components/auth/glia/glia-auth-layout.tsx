import Link from "next/link";

import "./auth-glia.css";

export function GliaAuthRoot({ children }: { children: React.ReactNode }) {
  return <div className="glia-auth">{children}</div>;
}

function GliaWordmark() {
  return (
    <Link href="/" className="glia-auth__wordmark" aria-label="온라인 글리아 홈으로 이동">
      <span className="glia-auth__wordmark-mark" aria-hidden="true">
        G
      </span>
      <span>
        <span className="glia-auth__wordmark-name">온라인 글리아</span>
        <span className="glia-auth__wordmark-tag">회복을 위한 웰니스 코칭</span>
      </span>
    </Link>
  );
}

function GliaBrandCanvas() {
  return (
    <aside className="glia-auth__canvas">
      <div className="glia-auth__canvas-top">
        <GliaWordmark />
      </div>

      <div className="glia-auth__canvas-copy" aria-hidden="true">
        <p className="glia-auth__canvas-eyebrow">
          <span className="glia-auth__eyebrow-dot" />
          Recovery wellness
        </p>
        <p className="glia-auth__canvas-title">
          몸과 마음의
          <br />
          <em>회복</em>을
          <br />
          매일의 리듬으로
        </p>
        <p className="glia-auth__canvas-lede">
          신경과학과 움직임이 만나는 자리.
          <br />
          오늘의 작은 기록이 내일의 호흡을 바꿉니다.
        </p>
      </div>

      <p className="glia-auth__canvas-line" aria-hidden="true">
        정렬 · 순환 · 호흡 · 회복
      </p>
    </aside>
  );
}

export function GliaAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glia-auth__layout">
      <GliaBrandCanvas />

      <div className="glia-auth__column">
        <header className="glia-auth__topbar">
          <GliaWordmark />
        </header>

        <main className="glia-auth__main">{children}</main>
      </div>
    </div>
  );
}
