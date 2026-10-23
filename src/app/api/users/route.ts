import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nickname: true, createdAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      email: body.email.trim(),
      nickname: body.name?.trim() || null,
      password: body.password?.trim() || "changeme",
    },
  });

  return NextResponse.json({ id: user.id, nickname: user.nickname, createdAt: user.createdAt }, { status: 201 });
}
