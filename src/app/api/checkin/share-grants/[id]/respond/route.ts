import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { respondToShareGrant } from "@/lib/checkin-share/grants";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { decision: "ACCEPT" | "DECLINE" };

    if (body.decision !== "ACCEPT" && body.decision !== "DECLINE") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const userId = await resolveUserId(request);
    const result = await respondToShareGrant({
      grantId: id,
      userId,
      decision: body.decision,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
