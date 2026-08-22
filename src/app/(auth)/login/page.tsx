import { redirect } from "next/navigation";

import { GliaAuthPage } from "@/components/auth/glia/glia-auth-page";
import { LoginScreen } from "@/components/auth/login/login-screen";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { getKakaoConfig } from "@/lib/kakao-auth";
import { getCurrentUser } from "@/lib/session";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; method?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    redirect(resolvePostLoginPath(next, user.role));
  }

  const kakaoEnabled = Boolean(getKakaoConfig());

  return (
    <GliaAuthPage
      eyebrow="Login"
      title="다시 만나서"
      titleAccent="반가워요"
      description="강의 · 코칭 · 데일리 체크인을 이용하려면 로그인하세요."
    >
      <LoginScreen kakaoEnabled={kakaoEnabled} />

      {!kakaoEnabled && process.env.NODE_ENV === "development" && (
        <p className="glia-auth__note">
          카카오 로그인: `.env`에 `KAKAO_REST_API_KEY`, `KAKAO_REDIRECT_URI`를 설정하세요.
        </p>
      )}
    </GliaAuthPage>
  );
}
