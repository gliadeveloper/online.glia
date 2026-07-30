import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { coachingOfferingInclude, updateCoachingOffering } from "@/lib/coaching-admin";
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

    const offering = await prisma.coachingOffering.findUnique({
      where: { id },
      include: coachingOfferingInclude,
    });

    if (!offering) {
      throw new ApiError("Coaching offering not found", 404, "OFFERING_NOT_FOUND");
    }

    return NextResponse.json(offering);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "activate" | "deactivate";
      title?: string;
      description?: string;
      totalSessions?: number;
      validDays?: number;
      coachId?: string | null;
      courseId?: string | null;
      sessionTitles?: string[];
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (body.action === "activate" || body.action === "deactivate") {
      const offering = await updateCoachingOffering({
        actorId: userId,
        offeringId: id,
        isActive: body.action === "activate",
      });
      return NextResponse.json(offering);
    }

    const offering = await updateCoachingOffering({
      actorId: userId,
      offeringId: id,
      title: body.title,
      description: body.description,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
      coachId: body.coachId,
      courseId: body.courseId,
      sessionTitles: body.sessionTitles,
    });

    return NextResponse.json(offering);
  } catch (error) {
    return jsonError(error);
  }
}
