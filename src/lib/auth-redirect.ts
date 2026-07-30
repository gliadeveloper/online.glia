import type { UserRole } from "@/generated/prisma/client";

const DEFAULT_USER_PATH = "/";
const DEFAULT_ADMIN_PATH = "/admin";

function isSafeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

export function resolvePostLoginPath(next: string | null | undefined, role: UserRole) {
  if (next && isSafeRelativePath(next)) {
    return next;
  }

  return role === "ADMIN" ? DEFAULT_ADMIN_PATH : DEFAULT_USER_PATH;
}
