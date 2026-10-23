import { redirect } from "next/navigation";

import { resolvePostLoginPath } from "@/lib/auth-redirect";
import { needsOnboarding } from "@/lib/signup/constants";
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
      select: { onboardingCompletedAt: true, role: true },
    });

    if (dbUser && needsOnboarding(dbUser.onboardingCompletedAt)) {
      redirect(`/signup/terms${next ? `?next=${encodeURIComponent(next)}` : ""}`);
    }

    redirect(resolvePostLoginPath(next, dbUser?.role ?? user.role));
  }

  redirect(next ? `/signup?next=${encodeURIComponent(next)}` : "/signup");
}
