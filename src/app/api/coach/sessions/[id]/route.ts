import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { coachUpdateSession, getCoachSessionDetail } from "@/lib/coaching-coach";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const session = await getCoachSessionDetail(id, userId);
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      summary?: string | null;
      bodyMarkdown?: string | null;
      bodyMetadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
      publicationStatus?: "DRAFT" | "PUBLISHED" | "EMPTY";
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const session = await coachUpdateSession({
      coachId: userId,
      sessionId: id,
      summary: body.summary,
      bodyMarkdown: body.bodyMarkdown,
      bodyMetadata: body.bodyMetadata,
      publicationStatus: body.publicationStatus,
    });

    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
