import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, requireSessionUserId } from "@/lib/api";
import { readProductImageUpload, uploadProductDescriptionImageBuffer } from "@/lib/media/product-image";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await requireSessionUserId();
    await assertAdmin(userId);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

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
