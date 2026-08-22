import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { CheckInAccessManager } from "@/components/checkin/check-in-access-manager";
import { CheckinShell } from "@/components/checkin/checkin-shell";
import { listCheckInAccesses } from "@/lib/checkin-access";
import { getCurrentUser } from "@/lib/session";

export default async function CheckInSharingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkin/sharing");
  const activeCoaches = await listCheckInAccesses(user.id);

  return (
    <CheckinShell navTitle="코치 접근 관리" variant="hub">
      <header className="glia-ci-hub__hero">
        <div className="glia-ci-hub__ambient" aria-hidden="true">
          <span className="glia-ci-hub__blob glia-ci-hub__blob--mint" />
          <span className="glia-ci-hub__blob glia-ci-hub__blob--blue" />
          <span className="glia-ci-hub__blob glia-ci-hub__blob--wash" />
        </div>

        <div className="glia-ci-hub__hero-copy">
          <p className="glia-ci-hero__eyebrow">Coach sharing</p>
          <h1 className="glia-ci-hub__title">
            내 기록을 볼 코치를 <em>관리하세요</em>
          </h1>
          <p className="glia-ci-hub__lede">허용한 코치만 데일리·주간 체크인 기록을 볼 수 있습니다.</p>
          <p className="glia-ci-hub__philosophy">뇌 · 몸 · 회복 · 균형</p>
        </div>

        <section className="glia-ci-strip-card glia-ci-sharing__notice" aria-label="공유 범위">
          <span className="glia-ci-icon glia-ci-icon--recovery" aria-hidden="true">
            <ShieldCheck strokeWidth={2} size={20} />
          </span>
          <p>
            허용한 코치는 내가 직접 차단할 때까지, 이전 기록과 앞으로 작성·수정할 데일리·주간 체크인
            기록을 모두 볼 수 있어요.
          </p>
        </section>
      </header>

      <CheckInAccessManager initialActiveCoaches={activeCoaches} />
    </CheckinShell>
  );
}
