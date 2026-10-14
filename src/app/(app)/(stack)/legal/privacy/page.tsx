import type { Metadata } from "next";

import { AppStackPage } from "@/components/app";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { SiteLegalFooter } from "@/components/site/site-legal-footer";
import { buildPageMetadata } from "@/lib/site-metadata";
import { StackNavTitle } from "@/lib/stack-nav-context";

export const metadata: Metadata = buildPageMetadata({
  title: "개인정보 처리방침",
  description: "GLIA가 개인정보를 처리하는 기준입니다.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <AppStackPage>
      <StackNavTitle title="개인정보 처리방침" />
      <PrivacyPolicy />
      <SiteLegalFooter />
    </AppStackPage>
  );
}
