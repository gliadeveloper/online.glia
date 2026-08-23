import type { Metadata } from "next";

import { privateSectionMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = { ...privateSectionMetadata, title: "주문 내역" };

export default function OrdersStackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
