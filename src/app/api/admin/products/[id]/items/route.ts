import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import type { ProductItemKind } from "@/generated/prisma/client";
import { updateProductItems } from "@/lib/products";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      items: Array<{
        kind: ProductItemKind;
        courseId?: string;
        coachingOfferingId?: string;
        sortOrder?: number;
      }>;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.items?.length) {
      return NextResponse.json({ error: "items are required" }, { status: 400 });
    }

    const product = await updateProductItems({
      actorId: userId,
      productId,
      items: body.items,
    });

    return NextResponse.json(product);
  } catch (error) {
    return jsonError(error);
  }
}
