import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createForm, formDetailInclude } from "@/lib/forms";
import type { FormQuestionType, FormPurpose, FormSchedule } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    await assertAdmin(userId);

    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        ...formDetailInclude,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json(forms);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      slug?: string;
      title?: string;
      description?: string;
      purpose?: FormPurpose;
      schedule?: FormSchedule;
      timezone?: string;
      organizationId?: string;
      courseId?: string;
      publish?: boolean;
      questions?: Array<{
        prompt: string;
        description?: string;
        type: FormQuestionType;
        order: number;
        isRequired?: boolean;
        options?: Array<{
          label: string;
          value?: string;
          emoji?: string;
          order: number;
        }>;
      }>;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.slug?.trim() || !body.title?.trim()) {
      throw new ApiError("slug and title are required", 400, "VALIDATION_ERROR");
    }

    if (!body.questions?.length) {
      throw new ApiError("questions are required", 400, "VALIDATION_ERROR");
    }

    const form = await createForm({
      createdById: userId,
      slug: body.slug.trim(),
      title: body.title.trim(),
      description: body.description?.trim(),
      purpose: body.purpose,
      schedule: body.schedule,
      timezone: body.timezone,
      organizationId: body.organizationId,
      courseId: body.courseId,
      questions: body.questions,
      publish: body.publish,
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
