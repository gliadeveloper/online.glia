import { NextResponse } from "next/server";

import { assertCoach, jsonError, resolveUserId } from "@/lib/api";
import { listCoachCustomers } from "@/lib/coach-customers";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const customers = await listCoachCustomers(userId);
    return NextResponse.json(customers);
  } catch (error) {
    return jsonError(error);
  }
}
