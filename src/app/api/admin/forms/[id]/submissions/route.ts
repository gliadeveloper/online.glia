import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const form = await prisma.form.findUnique({ where: { id }, select: { id: true } });
    if (!form) {
      throw new ApiError("Form not found", 404, "FORM_NOT_FOUND");
    }

    const limit = Number(url.searchParams.get("limit") ?? 30);

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: id },
      orderBy: { checkInDate: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: { select: { id: true, prompt: true, order: true, type: true } },
            option: { select: { id: true, label: true, emoji: true } },
          },
        },
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    return jsonError(error);
  }
}
