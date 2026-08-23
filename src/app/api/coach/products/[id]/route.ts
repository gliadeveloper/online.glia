import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  assertCoachOwnsProduct,
  getCoachProductCatalog,
  updateCoachProduct,
} from "@/lib/coach-commerce";
import { parseProductSupplies } from "@/lib/products";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const product = await assertCoachOwnsProduct(userId, id);
    const catalog = await getCoachProductCatalog(userId);

    return NextResponse.json({ product, catalog });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      descriptionMetadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
      supplies?: unknown;
      listPrice?: number;
      salePrice?: number | null;
      isActive?: boolean;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const product = await updateCoachProduct({
      coachId: userId,
      productId: id,
      title: body.title,
      description: body.description,
      descriptionMetadata: body.descriptionMetadata,
      supplies: parseProductSupplies(body.supplies),
      listPrice: body.listPrice,
      salePrice: body.salePrice,
      isActive: body.isActive,
    });

    return NextResponse.json(product);
  } catch (error) {
    return jsonError(error);
  }
}
