import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { createCoachOffering, listCoachOfferings } from "@/lib/coach-offerings";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const offerings = await listCoachOfferings(userId);
    return NextResponse.json(offerings);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      slug?: string;
      description?: string;
      totalSessions?: number;
      validDays?: number;
      courseId?: string;
      isActive?: boolean;
      sessionTitles?: string[];
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.title?.trim() || !body.slug?.trim() || !body.totalSessions || !body.validDays) {
      throw new ApiError(
        "title, slug, totalSessions, validDays are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const offering = await createCoachOffering({
      coachId: userId,
      title: body.title,
      slug: body.slug,
      description: body.description,
      totalSessions: body.totalSessions,
      validDays: body.validDays,
      courseId: body.courseId,
      isActive: body.isActive,
      sessionTitles: body.sessionTitles,
    });

    return NextResponse.json(offering, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
