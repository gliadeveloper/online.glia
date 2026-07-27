import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import {
  coachingOfferingInclude,
  createCoachingOffering,
} from "@/lib/coaching-admin";
import type { CoachingDeliveryMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const offerings = await prisma.coachingOffering.findMany({
      orderBy: { updatedAt: "desc" },
      include: coachingOfferingInclude,
    });

    return NextResponse.json(offerings);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      slug?: string;
      description?: string;
      deliveryMode?: CoachingDeliveryMode;
      totalSessions?: number;
      validDays?: number;
      sessionMinutes?: number;
      coachId?: string;
      courseId?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim() || !body.slug?.trim() || !body.totalSessions || !body.validDays) {
      throw new ApiError(
        "title, slug, totalSessions, validDays are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const offering = await createCoachingOffering({
      actorId: userId,
      title: body.title,
      slug: body.slug,
      description: body.description,
      deliveryMode: body.deliveryMode,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
      sessionMinutes: body.sessionMinutes,
      coachId: body.coachId,
      courseId: body.courseId,
    });

    return NextResponse.json(offering, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
