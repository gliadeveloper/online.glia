import { redirect } from "next/navigation";

import { SignupTermsScreen } from "@/components/auth/signup/signup-onboarding-screens";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { signupOnboardingPath } from "@/lib/signup/constants";

type SignupTermsPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupTermsPage({ searchParams }: SignupTermsPageProps) {
  const { next } = await searchParams;
  const session = await getCurrentUser();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        name: true,
        phoneNumber: true,
        email: true,
        emailKind: true,
        onboardingCompletedAt: true,
      },
    });
    const continuation = user ? signupOnboardingPath(user, next) : null;
    if (continuation?.startsWith("/signup/contact")) {
      redirect(continuation);
    }
  }

  return <SignupTermsScreen />;
}
