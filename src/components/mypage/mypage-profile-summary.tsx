import Link from "next/link";

import type { MyPageData } from "@/lib/mypage";

type MyPageProfileSummaryProps = {
  data: MyPageData;
};

export function MyPageProfileSummary({ data }: MyPageProfileSummaryProps) {
  const { displayName, displayEmail, avatarUrl, headline, bio, authMethods } = data;
  const initial = displayName.trim().charAt(0) || "회";

  return (
    <section className="glia-mypage__profile" aria-labelledby="mypage-profile-heading">
      <div className="glia-mypage__avatar" aria-hidden="true">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          initial
        )}
      </div>

      <div className="glia-mypage__identity">
        <h2 id="mypage-profile-heading" className="glia-mypage__name">
          {displayName}
        </h2>
        {headline ? <p className="glia-mypage__headline">{headline}</p> : null}
        <p className="glia-mypage__email">{displayEmail ?? "연결된 이메일 없음"}</p>
        {bio ? <p className="glia-mypage__bio">{bio}</p> : null}

        <ul className="glia-mypage__methods" aria-label="로그인 방식">
          {authMethods.kakao ? <li className="glia-mypage__chip">카카오</li> : null}
          {authMethods.email ? <li className="glia-mypage__chip">이메일</li> : null}
        </ul>
      </div>

      <Link href="/mypage/edit" className="glia-mypage__edit">
        수정
      </Link>
    </section>
  );
}
