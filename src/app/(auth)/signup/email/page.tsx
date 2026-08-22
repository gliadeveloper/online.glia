import { Suspense } from "react";

import { SignupEmailScreen as SignupEmailScreenInner } from "@/components/auth/signup/signup-screens";
import { SignupSuspenseFallback } from "@/components/auth/signup/signup-step";

export default function SignupEmailPage() {
  return (
    <Suspense fallback={<SignupSuspenseFallback />}>
      <SignupEmailScreenInner />
    </Suspense>
  );
}
