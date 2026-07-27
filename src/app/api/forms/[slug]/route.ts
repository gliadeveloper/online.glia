import { NextResponse } from "next/server";

import { ApiError, jsonError } from "@/lib/api";
import { formDetailInclude } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const form = await prisma.form.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: formDetailInclude,
    });

    if (!form) {
      throw new ApiError("Form not found", 404, "FORM_NOT_FOUND");
    }

    return NextResponse.json(form);
  } catch (error) {
    return jsonError(error);
  }
}
