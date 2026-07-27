import { NextResponse } from "next/server";

import { assertAdmin, jsonError, resolveUserId } from "@/lib/api";
import { createTag, listTags } from "@/lib/taxonomy-admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });
    await assertAdmin(userId);

    const tags = await listTags();
    return NextResponse.json(tags);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      name?: string;
      slug?: string;
    };

    const userId = await resolveUserId(request, body);
    await assertAdmin(userId);

    if (!body.name?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const tag = await createTag({
      actorId: userId,
      name: body.name,
      slug: body.slug,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
