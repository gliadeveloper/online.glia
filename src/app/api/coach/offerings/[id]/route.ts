import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { assertCoachOwnsOffering, updateCoachOffering } from "@/lib/coach-offerings";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const offering = await assertCoachOwnsOffering(userId, id);
    return NextResponse.json(offering);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: "activate" | "deactivate";
      title?: string;
      description?: string;
      totalSessions?: number;
      validDays?: number;
      courseId?: string | null;
      sessionTitles?: string[];
      isActive?: boolean;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);
    await assertCoachOwnsOffering(userId, id);

    if (body.action === "activate" || body.action === "deactivate") {
      const offering = await updateCoachOffering({
        coachId: userId,
        offeringId: id,
        isActive: body.action === "activate",
      });
      return NextResponse.json(offering);
    }

    if (body.courseId) {
      const course = await prisma.course.findUnique({ where: { id: body.courseId } });
      if (!course || course.instructorId !== userId) {
        throw new ApiError("Course access denied", 403, "FORBIDDEN");
      }
    }

    const offering = await updateCoachOffering({
      coachId: userId,
      offeringId: id,
      title: body.title,
      description: body.description,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
      courseId: body.courseId,
      isActive: body.isActive,
      sessionTitles: body.sessionTitles,
    });

    return NextResponse.json(offering);
  } catch (error) {
    return jsonError(error);
  }
}
