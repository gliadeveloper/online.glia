import type { Metadata } from "next";

import { AppStackPage } from "@/components/app";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { SiteLegalFooter } from "@/components/site/site-legal-footer";
import { buildPageMetadata } from "@/lib/site-metadata";
import { StackNavTitle } from "@/lib/stack-nav-context";

export const metadata: Metadata = buildPageMetadata({
  title: "이용약관",
  description: "GLIA 온라인 서비스 이용 조건입니다.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <AppStackPage>
      <StackNavTitle title="이용약관" />
      <TermsOfService />
      <SiteLegalFooter />
    </AppStackPage>
  );
}
