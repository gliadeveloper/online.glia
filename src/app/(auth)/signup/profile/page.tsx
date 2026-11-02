import { redirect } from "next/navigation";

import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { signupOnboardingPath } from "@/lib/signup/constants";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type SignupProfilePageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupProfilePage({ searchParams }: SignupProfilePageProps) {
  const { next } = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        onboardingCompletedAt: true,
        role: true,
        name: true,
        phoneNumber: true,
        email: true,
        emailKind: true,
      },
    });

    if (dbUser) {
      const continuation = signupOnboardingPath(dbUser, next);
      redirect(continuation ?? resolvePostLoginPath(next, dbUser.role));
    }

    redirect(resolvePostLoginPath(next, user.role));
  }

  redirect(next ? `/signup?next=${encodeURIComponent(next)}` : "/signup");
}
