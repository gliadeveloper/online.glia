import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { getProductPrice } from "@/lib/fulfillment";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ kind: "asc" }, { title: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            course: { select: { id: true, title: true } },
            coachingOffering: {
              select: {
                id: true,
                slug: true,
                title: true,
                totalSessions: true,
                validDays: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      products.map((product) => ({
        ...product,
        price: getProductPrice(product),
      })),
    );
  } catch (error) {
    return jsonError(error);
  }
}
