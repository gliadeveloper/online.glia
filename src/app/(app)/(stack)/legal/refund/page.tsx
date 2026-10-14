import type { Metadata } from "next";

import { RefundPolicy } from "@/components/legal/refund-policy";
import { SiteLegalFooter } from "@/components/site/site-legal-footer";
import { AppStackPage } from "@/components/app";
import { buildPageMetadata } from "@/lib/site-metadata";
import { StackNavTitle } from "@/lib/stack-nav-context";

export const metadata: Metadata = buildPageMetadata({
  title: "취소 및 환불정책",
  description: "GLIA 프로그램의 취소와 환불 기준, 신청 방법입니다.",
  path: "/legal/refund",
});

export default function RefundPolicyPage() {
  return (
    <AppStackPage>
      <StackNavTitle title="취소 및 환불정책" />
      <RefundPolicy />
      <SiteLegalFooter />
    </AppStackPage>
  );
}
