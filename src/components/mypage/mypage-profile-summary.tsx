import { TrustButtonLink } from "@/components/corporate-trust/app-trust-ui";
import { Typography } from "@/components/typography/typography";
import type { MyPageData } from "@/lib/mypage";

type MyPageProfileSummaryProps = {
  data: MyPageData;
};

function AuthMethodBadge({ label }: { label: string }) {
  return <span className="app-chip">{label}</span>;
}

export function MyPageProfileSummary({ data }: MyPageProfileSummaryProps) {
  const { displayName, displayEmail, avatarUrl, headline, bio, authMethods } = data;
  const initial = displayName.trim().charAt(0) || "회";

  return (
    <section aria-labelledby="mypage-profile-heading" className="app-panel app-panel--padded">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Typography as="h2" id="mypage-profile-heading" role="sectionTitle" weight="semibold" color="primary">
          프로필
        </Typography>
        <TrustButtonLink href="/mypage/edit" variant="secondary" className="!min-h-10 !px-4 !py-2 text-sm">
          수정
        </TrustButtonLink>
      </div>

      <div className="flex items-start gap-4">
        <div className="community-avatar community-avatar--md text-xl" aria-hidden="true">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Typography as="p" role="bodyCompact" weight="semibold" color="primary">
            {displayName}
          </Typography>
          {headline && (
            <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
              {headline}
            </Typography>
          )}
          {bio && (
            <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc whitespace-pre-wrap">
              {bio}
            </Typography>
          )}
          {displayEmail ? (
            <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
              {displayEmail}
            </Typography>
          ) : (
            <Typography as="p" role="bodySecondary" color="secondary" className="app-section-header__desc">
              연결된 이메일 없음
            </Typography>
          )}

          <ul className="app-section-header__desc flex flex-wrap gap-2" aria-label="로그인 방식">
            {authMethods.kakao && (
              <li>
                <AuthMethodBadge label="카카오" />
              </li>
            )}
            {authMethods.email && (
              <li>
                <AuthMethodBadge label="이메일" />
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
