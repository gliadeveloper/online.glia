import { NextResponse } from "next/server";

import { assertCoach, jsonError, requireSessionUserId } from "@/lib/api";
import { assertCoachOwnsProduct } from "@/lib/coach-commerce";
import { readProductImageUpload, uploadProductDescriptionImageBuffer } from "@/lib/media/product-image";

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await requireSessionUserId();
    await assertCoach(userId);
    const product = await assertCoachOwnsProduct(userId, id);

    const file = await readProductImageUpload(request);
    const uploaded = await uploadProductDescriptionImageBuffer({
      productId: product.id,
      ...file,
    });
    return NextResponse.json(uploaded);
  } catch (error) {
    return jsonError(error);
  }
}
