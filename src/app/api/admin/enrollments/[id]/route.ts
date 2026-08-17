import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { updateEnrollment } from "@/lib/enrollments-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        progress: {
          include: {
            lesson: { select: { id: true, title: true, order: true } },
          },
        },
      },
    });

    if (!enrollment) {
      throw new ApiError("Enrollment not found", 404, "NOT_FOUND");
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      status?: "ACTIVE" | "COMPLETED" | "DROPPED" | "SUSPENDED";
      progressPercent?: number;
    };

    const actorId = await resolveUserId(request, body);
    await assertAdmin(actorId);

    const enrollment = await updateEnrollment({
      actorId,
      enrollmentId: id,
      status: body.status,
      progressPercent: body.progressPercent,
    });

    return NextResponse.json(enrollment);
  } catch (error) {
    return jsonError(error);
  }
}
