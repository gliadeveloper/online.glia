import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
      name: body.name?.trim() || null,
      password: body.password?.trim() || "changeme",
    },
  });

  return NextResponse.json(user, { status: 201 });
}
