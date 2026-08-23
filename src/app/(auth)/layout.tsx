import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = privateSectionMetadata;

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
