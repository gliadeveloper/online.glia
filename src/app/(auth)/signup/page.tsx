import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupLandingScreen } from "@/components/auth/signup/signup-screens";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { needsOnboarding } from "@/lib/signup/constants";
import { getCurrentUser } from "@/lib/session";
import { buildPageMetadata, defaultOgImages, noIndexRobots } from "@/lib/site-metadata";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = buildPageMetadata({
  title: "회원가입",
  description: "GLIA 계정을 만들고 강의 · 코칭 · 체크인을 시작합니다.",
  path: "/signup",
  images: defaultOgImages,
  robots: noIndexRobots,
});

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingCompletedAt: true, role: true },
    });

    if (dbUser && !needsOnboarding(dbUser.onboardingCompletedAt)) {
      redirect(resolvePostLoginPath(next, dbUser.role));
    }

    redirect(`/signup/terms${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return <SignupLandingScreen />;
}
