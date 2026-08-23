import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = { ...privateSectionMetadata, title: "마이페이지" };

export default function MypageStackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
