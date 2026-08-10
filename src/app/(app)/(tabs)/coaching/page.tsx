import {
  AppButtonLink,
  AppEmptyState,
  AppSection,
  AppTabScreen,
} from "@/components/app";
import {
  CoachingEntitlementCard,
  coachingEntitlementCardProps,
} from "@/components/coaching/coaching-entitlement-card";
import { TabPageHeader } from "@/components/corporate-trust/tab-page-header";
import { HeaderAuthAction } from "@/components/shell/header-auth-action";
import { getUserCoachingEntitlements } from "@/lib/coaching-customer";
import { getCurrentUser } from "@/lib/session";

const coachingHeader = (
  <TabPageHeader
    eyebrow="Coaching"
    title="나만의"
    titleAccent="코칭 여정"
    description="보유 중인 코칭 상품과 회차를 한곳에서 관리하세요."
    variant="compact"
  />
);

export default async function CoachingTabPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AppTabScreen title="코칭" header={coachingHeader}>
        <AppEmptyState
          message="로그인 후 보유 중인 코칭 상품과 회차를 확인할 수 있습니다."
          action={<HeaderAuthAction isLoggedIn={false} />}
        />
      </AppTabScreen>
    );
  }

  const entitlements = await getUserCoachingEntitlements(user.id);

  return (
    <AppTabScreen title="코칭" header={coachingHeader}>
      {entitlements.length === 0 ? (
        <AppEmptyState
          message="보유 중인 코칭 상품이 없습니다."
          action={<AppButtonLink href="/shop">코칭 상품 보기</AppButtonLink>}
        />
      ) : (
        <AppSection labelledBy="coaching-product-list-heading">
          <h2 id="coaching-product-list-heading" className="sr-only">
            등록된 코칭 상품
          </h2>
          <ul className="app-section app-grid">
            {entitlements.map((entitlement) => (
              <CoachingEntitlementCard
                key={entitlement.id}
                {...coachingEntitlementCardProps(entitlement)}
              />
            ))}
          </ul>
        </AppSection>
      )}
    </AppTabScreen>
  );
}
