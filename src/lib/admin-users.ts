import type { UserRole } from "@/generated/prisma/client";

import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const USER_ROLES = new Set<UserRole>(["USER", "COACH", "ADMIN"]);

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.has(value as UserRole);
}

export async function updateUserRole(params: {
  actorId: string;
  userId: string;
  role: UserRole;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (!user) {
    throw new ApiError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND");
  }

  if (user.role === params.role) {
    return user;
  }

  if (user.role === "ADMIN" && params.role !== "ADMIN") {
    const remainingAdmins = await prisma.user.count({
      where: {
        role: "ADMIN",
        status: "ACTIVE",
        id: { not: user.id },
      },
    });

    if (remainingAdmins === 0) {
      throw new ApiError(
        "마지막 관리자의 역할은 변경할 수 없습니다.",
        400,
        "LAST_ADMIN",
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: params.role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userId: true,
      status: true,
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "User",
    entityId: updated.id,
    action: "USER_ROLE_UPDATED",
    metadata: {
      from: user.role,
      to: updated.role,
      email: updated.email,
    },
  });

  return updated;
}
