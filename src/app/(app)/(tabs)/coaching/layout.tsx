import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = { ...privateSectionMetadata, title: "코칭" };

export default function CoachingTabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
