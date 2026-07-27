import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { formDetailInclude } from "@/lib/forms";
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

    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        ...formDetailInclude,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      throw new ApiError("Form not found", 404, "FORM_NOT_FOUND");
    }

    return NextResponse.json(form);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      action?: "publish" | "archive";
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (body.action !== "publish" && body.action !== "archive") {
      throw new ApiError('action must be "publish" or "archive"', 400, "INVALID_ACTION");
    }

    const form = await prisma.form.update({
      where: { id },
      data:
        body.action === "publish"
          ? { status: "PUBLISHED", publishedAt: new Date() }
          : { status: "ARCHIVED" },
      include: formDetailInclude,
    });

    await writeAuditLog({
      actorId: userId,
      entityType: "Form",
      entityId: form.id,
      action: body.action === "publish" ? "FORM_PUBLISHED" : "FORM_ARCHIVED",
      metadata: { slug: form.slug },
    });

    return NextResponse.json(form);
  } catch (error) {
    return jsonError(error);
  }
}
