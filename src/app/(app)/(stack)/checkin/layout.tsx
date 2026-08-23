import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = { ...privateSectionMetadata, title: "체크인" };

export default function CheckinStackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
