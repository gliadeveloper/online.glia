import { NextResponse } from "next/server";

import { ApiError, assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import {
  getCheckInFormsSetupStatus,
  upsertCheckInFormFromTemplate,
} from "@/lib/checkin-admin-setup";
import type { CheckInFormKind } from "@/lib/checkin-form-templates";
import { prisma } from "@/lib/prisma";

function parseKind(value: unknown): CheckInFormKind {
  if (value === "daily" || value === "weekly") {
    return value;
  }
  throw new ApiError('kind must be "daily" or "weekly"', 400, "VALIDATION_ERROR");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const items = await getCheckInFormsSetupStatus();
    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      kind?: unknown;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    const kind = parseKind(body.kind);

    const organization = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const form = await upsertCheckInFormFromTemplate({
      kind,
      createdById: userId,
      organizationId: organization?.id,
    });

    await writeAuditLog({
      actorId: userId,
      entityType: "Form",
      entityId: form.id,
      action: "CHECKIN_FORM_SETUP",
      metadata: { slug: form.slug, kind },
    });

    const items = await getCheckInFormsSetupStatus();
    return NextResponse.json({ form, items });
  } catch (error) {
    return jsonError(error);
  }
}
