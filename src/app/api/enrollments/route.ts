import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        progress: {
          select: {
            id: true,
            status: true,
            lessonId: true,
          },
        },
      },
    });

    return NextResponse.json(enrollments);
  } catch (error) {
    return jsonError(error);
  }
}
