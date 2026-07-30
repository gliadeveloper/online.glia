import { NextResponse } from "next/server";

import { ApiError, jsonError, resolveUserId } from "@/lib/api";
import { checkout } from "@/lib/fulfillment";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      productSlug?: string;
      idempotencyKey?: string;
    };

    const userId = await resolveUserId(request, body);

    if (!body.productSlug?.trim()) {
      throw new ApiError("productSlug is required", 400, "PRODUCT_SLUG_REQUIRED");
    }

    const order = await checkout({
      userId,
      productSlug: body.productSlug.trim(),
      idempotencyKey: body.idempotencyKey?.trim(),
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return jsonError(new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND"));
      }
      if (error.message === "USER_NOT_FOUND") {
        return jsonError(new ApiError("User not found", 404, "USER_NOT_FOUND"));
      }
    }

    return jsonError(error);
  }
}