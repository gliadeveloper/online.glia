import { redirect } from "next/navigation";

import { SignupLandingScreen } from "@/components/auth/signup/signup-screens";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { needsOnboarding } from "@/lib/signup/constants";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
