import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { getCoachOrder } from "@/lib/coach-orders";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const detail = await getCoachOrder(userId, id);
    return NextResponse.json(detail);
  } catch (error) {
    return jsonError(error);
  }
}
