import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { getProductPrice } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: { select: { id: true, title: true, description: true } },
            coachingOffering: {
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                totalSessions: true,
                validDays: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    return NextResponse.json({
      ...product,
      price: getProductPrice(product),
    });
  } catch (error) {
    return jsonError(error);
  }
}
