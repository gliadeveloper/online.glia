import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = { ...privateSectionMetadata, title: "내학습" };

export default function LearningStackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
