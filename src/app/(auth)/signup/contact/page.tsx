import { redirect } from "next/navigation";

import { SignupContactScreen } from "@/components/auth/signup/signup-onboarding-screens";
import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { toContactSnapshot } from "@/lib/member-contact";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { signupOnboardingPath } from "@/lib/signup/constants";

type SignupContactPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupContactPage({ searchParams }: SignupContactPageProps) {
  const { next } = await searchParams;
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const session = await getCurrentUser();
  if (!session) {
    redirect(next ? `/signup?next=${encodeURIComponent(next)}` : "/signup");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      phoneNumber: true,
      email: true,
      emailKind: true,
      onboardingCompletedAt: true,
      role: true,
    },
  });
  if (!user) {
    redirect(`/signup${nextQuery}`);
  }

  const continuation = signupOnboardingPath(user, next);
  if (continuation?.startsWith("/signup/terms")) {
    redirect(continuation);
  }
  if (!continuation) {
    redirect(resolvePostLoginPath(next, user.role));
  }

  return <SignupContactScreen initial={toContactSnapshot(user)} next={next ?? null} />;
}
