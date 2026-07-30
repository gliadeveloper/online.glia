import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { updateCoachProductItems } from "@/lib/coach-commerce";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      items?: Array<{
        kind: "COURSE_ACCESS" | "COACHING_ACCESS";
        courseId?: string;
        coachingOfferingId?: string;
        sortOrder?: number;
      }>;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.items?.length) {
      throw new ApiError("items are required", 400, "VALIDATION_ERROR");
    }

    const product = await updateCoachProductItems({
      coachId: userId,
      productId: id,
      items: body.items,
    });

    return NextResponse.json(product);
  } catch (error) {
    return jsonError(error);
  }
}
