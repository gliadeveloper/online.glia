import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { adminGrantCourseAccess } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const status = url.searchParams.get("status");
    const enrollments = await prisma.enrollment.findMany({
      where: status
        ? { status: status as "ACTIVE" | "COMPLETED" | "EXPIRED" | "DROPPED" | "SUSPENDED" }
        : undefined,
      orderBy: { enrolledAt: "desc" },
      take: Number(url.searchParams.get("limit") ?? 100),
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      targetUserId?: string;
      courseId?: string;
    };

    const actorId = await resolveUserId(request, body);
    await assertAdmin(actorId);

    if (!body.targetUserId || !body.courseId) {
      throw new ApiError("targetUserId and courseId are required", 400, "VALIDATION_ERROR");
    }

    const enrollment = await adminGrantCourseAccess({
      actorId,
      userId: body.targetUserId,
      courseId: body.courseId,
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
