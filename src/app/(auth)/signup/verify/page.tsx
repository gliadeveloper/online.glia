import { redirect } from "next/navigation";

import { SignupVerifyScreen } from "@/components/auth/signup/signup-onboarding-screens";
import { isSignupEmailVerificationEnabled } from "@/lib/signup/constants";

type SignupVerifyPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupVerifyPage({ searchParams }: SignupVerifyPageProps) {
  if (!isSignupEmailVerificationEnabled()) {
    const { next } = await searchParams;
    redirect(next ? `/signup/terms?next=${encodeURIComponent(next)}` : "/signup/terms");
  }

  return <SignupVerifyScreen />;
}
