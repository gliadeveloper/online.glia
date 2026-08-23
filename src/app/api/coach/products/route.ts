import { NextResponse } from "next/server";

import { ApiError, assertCoach, jsonError, resolveUserId } from "@/lib/api";
import {
  createCoachProduct,
  listCoachProducts,
} from "@/lib/coach-commerce";
import { parseProductSupplies } from "@/lib/products";
import type { ProductKind } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const products = await listCoachProducts(userId);
    return NextResponse.json(products);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      descriptionMetadata?: import("@/generated/prisma/client").Prisma.InputJsonValue | null;
      supplies?: unknown;
      kind?: ProductKind;
      listPrice?: number;
      salePrice?: number;
      activate?: boolean;
      items?: Array<{
        kind: "COURSE_ACCESS" | "COACHING_ACCESS";
        courseId?: string;
        coachingOfferingId?: string;
        sortOrder?: number;
      }>;
    };

    const userId = await resolveUserId(request);
    await assertCoach(userId);

    if (!body.title?.trim() || !body.kind || body.listPrice == null) {
      throw new ApiError("title, kind, listPrice are required", 400, "VALIDATION_ERROR");
    }

    if (!body.items?.length) {
      throw new ApiError("items are required", 400, "VALIDATION_ERROR");
    }

    const product = await createCoachProduct({
      coachId: userId,
      title: body.title,
      description: body.description,
      descriptionMetadata: body.descriptionMetadata,
      supplies: parseProductSupplies(body.supplies),
      kind: body.kind,
      listPrice: body.listPrice,
      salePrice: body.salePrice,
      items: body.items,
      activate: body.activate ?? true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
