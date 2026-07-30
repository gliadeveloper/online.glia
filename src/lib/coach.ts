import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

/** Coach portal — COACH role only (not ADMIN). */
export async function requireCoach() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/coach");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  if (user.role !== "COACH") {
    redirect("/mypage");
  }

  return user;
}
