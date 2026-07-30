import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachOrders } from "@/lib/coach-orders";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const orders = await listCoachOrders(userId);
    return NextResponse.json(orders);
  } catch (error) {
    return jsonError(error);
  }
}
