import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const purpose = url.searchParams.get("purpose");
    const limit = Number(url.searchParams.get("limit") ?? 50);

    const submissions = await prisma.formSubmission.findMany({
      where: {
        form: {
          purpose: purpose
            ? (purpose as "DAILY_CHECKIN" | "WEEKLY_CHECKIN")
            : { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        form: {
          select: {
            id: true,
            slug: true,
            title: true,
            purpose: true,
            schedule: true,
          },
        },
        answers: {
          include: {
            question: { select: { prompt: true, order: true } },
            option: { select: { label: true, emoji: true } },
          },
        },
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    return jsonError(error);
  }
}
