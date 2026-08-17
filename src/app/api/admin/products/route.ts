import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createProduct, productInclude } from "@/lib/products";
import type { ProductItemKind, ProductKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const products = await prisma.product.findMany({
      orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
      include: productInclude,
    });

    return NextResponse.json(products);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      title?: string;
      description?: string;
      kind?: ProductKind;
      listPrice?: number;
      salePrice?: number;
      organizationId?: string;
      activate?: boolean;
      items?: Array<{
        kind: ProductItemKind;
        courseId?: string;
        coachingOfferingId?: string;
        sortOrder?: number;
      }>;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.title?.trim() || body.listPrice == null || !body.kind) {
      throw new ApiError("title, kind, listPrice are required", 400, "VALIDATION_ERROR");
    }

    const product = await createProduct({
      actorId: userId,
      title: body.title,
      description: body.description,
      kind: body.kind,
      listPrice: body.listPrice,
      salePrice: body.salePrice,
      organizationId: body.organizationId,
      items: body.items ?? [],
      activate: body.activate,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
