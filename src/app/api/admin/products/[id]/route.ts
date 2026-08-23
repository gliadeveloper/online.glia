import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { parseProductSupplies, productInclude, updateProduct } from "@/lib/products";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    return NextResponse.json(product);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "activate" | "deactivate";
      title?: string;
      description?: string;
      descriptionMetadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
      supplies?: unknown;
      listPrice?: number;
      salePrice?: number | null;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (body.action === "activate" || body.action === "deactivate") {
      const product = await updateProduct({
        actorId: userId,
        productId: id,
        isActive: body.action === "activate",
      });
      return NextResponse.json(product);
    }

    const product = await updateProduct({
      actorId: userId,
      productId: id,
      title: body.title,
      description: body.description,
      descriptionMetadata: body.descriptionMetadata,
      supplies: parseProductSupplies(body.supplies),
      listPrice: body.listPrice,
      salePrice: body.salePrice,
    });

    return NextResponse.json(product);
  } catch (error) {
    return jsonError(error);
  }
}
